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
  data: any[];
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
    // OKX API signature format: timestamp + method.toUpperCase() + requestPath + body
    const message = timestamp + method.toUpperCase() + requestPath + body;
    const signature = crypto.createHmac('sha256', this.secretKey).update(message, 'utf8').digest('base64');
    console.log('OKX Signature Debug:', {
      timestamp,
      method: method.toUpperCase(),
      requestPath,
      body,
      message,
      signature: signature.substring(0, 10) + '...'
    });
    return signature;
  }

  private getHeaders(method: string, requestPath: string, body: string = '') {
    // OKX requires Unix timestamp in seconds with milliseconds as decimal
    const timestamp = (Date.now() / 1000).toFixed(3);
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
      
      console.log('OKX API Request Details:', {
        url: `${this.baseUrl}${requestPath}`,
        headers: {
          'OK-ACCESS-KEY': headers['OK-ACCESS-KEY'].substring(0, 8) + '...',
          'OK-ACCESS-TIMESTAMP': headers['OK-ACCESS-TIMESTAMP'],
          'OK-ACCESS-PASSPHRASE': `"${headers['OK-ACCESS-PASSPHRASE']}"`,
          'OK-ACCESS-SIGN': headers['OK-ACCESS-SIGN'].substring(0, 10) + '...'
        }
      });

      const response = await fetch(`${this.baseUrl}${requestPath}`, {
        method: 'GET',
        headers,
      });

      const responseText = await response.text();
      console.log('OKX API Response Status:', response.status);
      console.log('OKX API Response Text:', responseText.substring(0, 300));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
      }

      const data: OKXAccountResponse = JSON.parse(responseText);

      if (data.code !== '0') {
        return {
          success: false,
          usdtBalance: 0,
          error: `OKX API error: ${data.msg}`
        };
      }

      // Parse all possible balance structures
      let totalUsdtBalance = 0;
      
      // Search through all data entries and their details
      for (const account of data.data) {
        // Check direct balance structure
        if (account.ccy === 'USDT') {
          totalUsdtBalance += parseFloat(account.availBal || account.bal || account.cashBal || '0');
        }
        
        // Check details array structure
        if (account.details && Array.isArray(account.details)) {
          for (const detail of account.details) {
            if (detail.ccy === 'USDT') {
              totalUsdtBalance += parseFloat(detail.availBal || detail.cashBal || detail.bal || '0');
            }
          }
        }
      }

      console.log(`OKX Live Balance: ${totalUsdtBalance} USDT`);

      return {
        success: true,
        usdtBalance: totalUsdtBalance
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