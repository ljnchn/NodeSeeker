import { DatabaseService, BaseConfig } from './database';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    username: string;
    isInitialized: boolean;
  };
}

export interface JWTPayload {
  username: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly JWT_SECRET = 'nodeseeker-jwt-secret-key'; // 在生产环境中应该使用环境变量
  private readonly TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7天过期 (秒)

  constructor(private dbService: DatabaseService) {}

  /**
   * 生成 JWT token (使用 Web Crypto API)
   */
  private async generateToken(username: string): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      username,
      iat: now,
      exp: now + this.TOKEN_EXPIRY
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = await this.signHmacSha256(data, this.JWT_SECRET);
    
    return `${data}.${signature}`;
  }

  /**
   * 验证 JWT token (使用 Web Crypto API)
   */
  async verifyToken(token: string): Promise<{ valid: boolean; payload?: JWTPayload; message?: string }> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, message: 'Token 格式无效' };
      }

      const [encodedHeader, encodedPayload, signature] = parts;
      const data = `${encodedHeader}.${encodedPayload}`;
      
      // 验证签名
      const expectedSignature = await this.signHmacSha256(data, this.JWT_SECRET);
      if (signature !== expectedSignature) {
        return { valid: false, message: 'Token 签名无效' };
      }

      // 解析 payload
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as JWTPayload;
      
      // 检查过期时间
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return { valid: false, message: 'Token 已过期' };
      }

      // 验证用户是否仍然存在
      const config = await this.dbService.getBaseConfig();
      if (!config || config.username !== payload.username) {
        return { valid: false, message: '用户不存在' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, message: `Token 验证失败: ${error}` };
    }
  }

  /**
   * Base64 URL 编码
   */
  private base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Base64 URL 解码
   */
  private base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  }

  /**
   * HMAC SHA256 签名
   */
  private async signHmacSha256(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * 用户注册（初始化）
   */
  async register(request: RegisterRequest): Promise<AuthResult> {
    try {
      // 检查是否已经初始化
      const isInitialized = await this.dbService.isInitialized();
      if (isInitialized) {
        return {
          success: false,
          message: '系统已经初始化，无法重复注册'
        };
      }

      // 验证输入
      const validation = this.validateRegisterInput(request);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // 初始化数据库表
      try {
        await this.dbService.initializeTables();
      } catch (error) {
        console.error('数据库表初始化失败:', error);
        return {
          success: false,
          message: `数据库表初始化失败: ${error}`
        };
      }

      // 明文存储密码
      const plainPassword = request.password;

      // 创建用户配置
      const config = await this.dbService.createBaseConfig({
        username: request.username,
        password: plainPassword,
        chat_id: '', // 初始为空，等待 Telegram 绑定
        stop_push: 0,
        only_title: 0
      });

      // 生成 JWT token
      const token = await this.generateToken(config.username);

      return {
        success: true,
        message: '系统初始化成功',
        token,
        user: {
          username: config.username,
          isInitialized: true
        }
      };
    } catch (error) {
      console.error('注册失败:', error);
      return {
        success: false,
        message: `注册失败: ${error}`
      };
    }
  }

  /**
   * 用户登录
   */
  async login(request: LoginRequest): Promise<AuthResult> {
    try {
      // 获取用户配置
      const config = await this.dbService.getBaseConfig();
      if (!config) {
        return {
          success: false,
          message: '系统尚未初始化，请先注册'
        };
      }

      // 验证用户名
      if (config.username !== request.username) {
        return {
          success: false,
          message: '用户名或密码错误'
        };
      }

      // 验证密码
      if (config.password !== request.password) {
        return {
          success: false,
          message: '用户名或密码错误'
        };
      }

      // 生成 JWT token
      const token = await this.generateToken(config.username);

      return {
        success: true,
        message: '登录成功',
        token,
        user: {
          username: config.username,
          isInitialized: true
        }
      };
    } catch (error) {
      console.error('登录失败:', error);
      return {
        success: false,
        message: `登录失败: ${error}`
      };
    }
  }

  /**
   * 刷新 token
   */
  async refreshToken(oldToken: string): Promise<AuthResult> {
    const verification = await this.verifyToken(oldToken);
    
    if (!verification.valid || !verification.payload) {
      return {
        success: false,
        message: verification.message || 'Token 无效'
      };
    }

    const newToken = await this.generateToken(verification.payload.username);

    return {
      success: true,
      message: 'Token 刷新成功',
      token: newToken,
      user: {
        username: verification.payload.username,
        isInitialized: true
      }
    };
  }

  /**
   * 修改密码
   */
  async changePassword(username: string, oldPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const config = await this.dbService.getBaseConfig();
      if (!config || config.username !== username) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      // 验证旧密码
      if (config.password !== oldPassword) {
        return {
          success: false,
          message: '原密码错误'
        };
      }

      // 验证新密码
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message
        };
      }

      // 更新密码（明文存储）
      await this.dbService.updateBaseConfig({
        password: newPassword
      });

      return {
        success: true,
        message: '密码修改成功'
      };
    } catch (error) {
      console.error('修改密码失败:', error);
      return {
        success: false,
        message: `修改密码失败: ${error}`
      };
    }
  }

  /**
   * 检查系统是否已初始化
   */
  async checkInitialization(): Promise<{ initialized: boolean; message: string }> {
    try {
      // 确保数据库表已创建（如果不存在则创建）
      try {
        await this.dbService.initializeTables();
      } catch (error) {
        console.error('数据库表初始化检查失败:', error);
        return {
          initialized: false,
          message: `数据库表初始化检查失败: ${error}`
        };
      }

      // 检查是否已经有用户配置
      const isInitialized = await this.dbService.isInitialized();
      return {
        initialized: isInitialized,
        message: isInitialized ? '系统已初始化' : '系统尚未初始化'
      };
    } catch (error) {
      return {
        initialized: false,
        message: `检查初始化状态失败: ${error}`
      };
    }
  }

  /**
   * 验证注册输入
   */
  private validateRegisterInput(request: RegisterRequest): { valid: boolean; message: string } {
    if (!request.username || request.username.trim().length === 0) {
      return { valid: false, message: '用户名不能为空' };
    }

    if (request.username.length < 3 || request.username.length > 20) {
      return { valid: false, message: '用户名长度必须在3-20个字符之间' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(request.username)) {
      return { valid: false, message: '用户名只能包含字母、数字和下划线' };
    }

    const passwordValidation = this.validatePassword(request.password);
    if (!passwordValidation.valid) {
      return passwordValidation;
    }

    if (request.password !== request.confirmPassword) {
      return { valid: false, message: '两次输入的密码不一致' };
    }

    return { valid: true, message: '验证通过' };
  }

  /**
   * 验证密码强度
   */
  private validatePassword(password: string): { valid: boolean; message: string } {
    if (!password || password.length === 0) {
      return { valid: false, message: '密码不能为空' };
    }

    if (password.length < 6) {
      return { valid: false, message: '密码长度至少6个字符' };
    }

    if (password.length > 50) {
      return { valid: false, message: '密码长度不能超过50个字符' };
    }

    // 可以添加更多密码强度验证规则
    // if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    //   return { valid: false, message: '密码必须包含大小写字母和数字' };
    // }

    return { valid: true, message: '密码强度符合要求' };
  }
}
