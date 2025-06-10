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

interface OKXOrder {
  instId: string;
  tdMode: string;
  side: 'buy' | 'sell';
  ordType: string;
  sz: string;
  px?: string;
  lever?: string;
  posSide?: string;
  reduceOnly?: boolean;
}

interface OKXPosition {
  instId: string;
  pos: string;
  posId: string;
  posSide: string;
  avgPx: string;
  markPx: string;
  pnl: string;
  pnlRatio: string;
  lever: string;
  margin: string;
  upl: string;
  uplRatio: string;
}

export class OKXClient {
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private baseUrl: string = 'https://www.okx.com';
  private isDemo: boolean = false;

  constructor(apiKey: string, secretKey: string, passphrase: string, demo: boolean = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passphrase = passphrase;
    this.isDemo = demo;
    
    // Use demo environment for testing
    if (demo) {
      this.baseUrl = 'https://www.okx.com'; // Demo API endpoint
    }
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

  async placeOrder(order: OKXOrder): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const requestPath = '/api/v5/trade/order';
      const body = JSON.stringify(order);
      const headers = this.getHeaders('POST', requestPath, body);

      const response = await fetch(`${this.baseUrl}${requestPath}`, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        return {
          success: false,
          error: `OKX Order Error: ${data.msg}`
        };
      }

      console.log(`✅ OKX Order Placed: ${order.side} ${order.sz} ${order.instId} at ${order.px || 'market'}`);

      return {
        success: true,
        orderId: data.data[0]?.ordId
      };

    } catch (error) {
      console.error('OKX Order Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown order error'
      };
    }
  }

  async getPositions(): Promise<{ success: boolean; positions: OKXPosition[]; error?: string }> {
    try {
      const requestPath = '/api/v5/account/positions';
      const headers = this.getHeaders('GET', requestPath);

      const response = await fetch(`${this.baseUrl}${requestPath}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        return {
          success: false,
          positions: [],
          error: `OKX API error: ${data.msg}`
        };
      }

      return {
        success: true,
        positions: data.data || []
      };

    } catch (error) {
      console.error('OKX Positions Error:', error);
      return {
        success: false,
        positions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async closePosition(instId: string, posSide: string): Promise<{ success: boolean; error?: string }> {
    try {
      const requestPath = '/api/v5/trade/close-position';
      const body = JSON.stringify({
        instId,
        posSide,
        mgnMode: 'isolated'
      });
      const headers = this.getHeaders('POST', requestPath, body);

      const response = await fetch(`${this.baseUrl}${requestPath}`, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        return {
          success: false,
          error: `OKX Close Position Error: ${data.msg}`
        };
      }

      console.log(`✅ OKX Position Closed: ${instId} ${posSide}`);

      return {
        success: true
      };

    } catch (error) {
      console.error('OKX Close Position Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown close position error'
      };
    }
  }

  async setLeverage(instId: string, lever: string, mgnMode: string = 'isolated'): Promise<{ success: boolean; error?: string }> {
    try {
      const requestPath = '/api/v5/account/set-leverage';
      const body = JSON.stringify({
        instId,
        lever,
        mgnMode
      });
      const headers = this.getHeaders('POST', requestPath, body);

      const response = await fetch(`${this.baseUrl}${requestPath}`, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        return {
          success: false,
          error: `OKX Set Leverage Error: ${data.msg}`
        };
      }

      console.log(`✅ OKX Leverage Set: ${instId} ${lever}x`);

      return {
        success: true
      };

    } catch (error) {
      console.error('OKX Set Leverage Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown leverage error'
      };
    }
  }
}