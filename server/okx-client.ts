import crypto from 'crypto';

interface OKXBalance {
  ccy: string;
  bal: string;
  frozenBal: string;
  availBal: string;
}

interface OKXAccountResponse {
  code: string;
  msg: string;
  data: OKXBalance[];
}

export class OKXClient {
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private baseUrl: string = 'https://www.okx.com';

  constructor(apiKey: string, secretKey: string, passphrase: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passphrase = passphrase;
  }

  private createSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
    const message = timestamp + method + requestPath + body;
    return crypto.createHmac('sha256', this.secretKey).update(message).digest('base64');
  }

  private getHeaders(method: string, requestPath: string, body: string = '') {
    const timestamp = new Date().toISOString();
    const signature = this.createSignature(timestamp, method, requestPath, body);

    return {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
    };
  }

  async getAccountBalance(): Promise<{ success: boolean; usdtBalance: number; error?: string }> {
    try {
      const requestPath = '/api/v5/account/balance';
      const headers = this.getHeaders('GET', requestPath);

      const response = await fetch(`${this.baseUrl}${requestPath}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OKXAccountResponse = await response.json();

      if (data.code !== '0') {
        return {
          success: false,
          usdtBalance: 0,
          error: `OKX API error: ${data.msg}`
        };
      }

      // Find USDT balance
      const usdtBalance = data.data.find(balance => balance.ccy === 'USDT');
      const availableBalance = usdtBalance ? parseFloat(usdtBalance.availBal) : 0;

      console.log(`OKX Live Balance: ${availableBalance} USDT`);

      return {
        success: true,
        usdtBalance: availableBalance
      };

    } catch (error) {
      console.error('OKX API Error:', error);
      return {
        success: false,
        usdtBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateMinimumBalance(minimumUSDT: number = 10): Promise<{ valid: boolean; balance: number; error?: string }> {
    const balanceResult = await this.getAccountBalance();
    
    if (!balanceResult.success) {
      return {
        valid: false,
        balance: 0,
        error: balanceResult.error
      };
    }

    return {
      valid: balanceResult.usdtBalance >= minimumUSDT,
      balance: balanceResult.usdtBalance,
      error: balanceResult.usdtBalance < minimumUSDT 
        ? `Insufficient balance: ${balanceResult.usdtBalance} USDT (minimum: ${minimumUSDT} USDT required)`
        : undefined
    };
  }
}