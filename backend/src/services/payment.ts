import crypto from 'crypto';
import axios from 'axios';
import https from 'https';
import * as forge from 'node-forge';

// Only apply rejectUnauthorized: false in sandbox mode
const isSandbox = process.env.TELEBIRR_MODE === 'sandbox';
if (isSandbox) {
  axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Dev only
  });
}


export interface TelebirrPaymentRequest {
  orderId: string;
  amount: number;
  userId: string;
  planId: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface TelebirrPaymentResponse {
  prepay_id: string;
  checkout_url: string;
}

/**
 * Telebirr Payment Integration Service
 * 
 * Payment Flow:
 * 1. Get token from Telebirr
 * 2. Create unified order with payment details
 * 3. Sign request using RSA private key
 * 4. Construct checkout URL
 * 5. Handle callback verification
 */
export class TelebirrPaymentService {
  private readonly appTokenId: string;
  private readonly appSecret: string;
  private readonly merchantId: string;
  private readonly merchantCode: string;
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly notifyUrl: string;
  private readonly baseUrl: string;
  private readonly checkoutBaseUrl: string;
  private readonly mode: 'sandbox' | 'production';

  constructor() {
    this.appTokenId = process.env.TELEBIRR_APP_ID!;
    this.appSecret = process.env.TELEBIRR_APP_SECRET!;
    this.merchantId = process.env.TELEBIRR_MERCHANT_ID!;
    this.merchantCode = process.env.TELEBIRR_MERCHANT_CODE!;
    this.privateKey = process.env.TELEBIRR_PRIVATE_KEY!.replace(/\\n/g, "\n");
    this.publicKey = process.env.TELEBIRR_PUBLIC_KEY || '';
    this.notifyUrl = process.env.TELEBIRR_NOTIFY_URL!;
    this.mode = (process.env.TELEBIRR_MODE as 'sandbox' | 'production') || 'sandbox';

    if (this.mode === 'sandbox') {
      this.baseUrl = 'https://196.188.120.3:38443/apiaccess/payment/gateway';
      this.checkoutBaseUrl = 'https://196.188.120.3:38443/payment/web/paygate';
    } else {
      this.baseUrl = 'https://api.ethiotelebirr.et';
      this.checkoutBaseUrl = 'https://portal.ethiotelebirr.et/payment/web/paygate'; // Assumed production URL
    }

    console.log(`🔧 Telebirr Payment Service initialized in ${this.mode} mode`);
  }
private excludeFields = [
  "sign",
  "sign_type",
  "header",
  "refund_info",
  "openType",
  "raw_request",
  
];


  /**
   * Flatten request data for signature generation
   */
 private flattenForSign(data: Record<string, any>): Record<string, string> {
  const flat: Record<string, string> = {};

  Object.keys(data).forEach((key) => {
    if (this.excludeFields.includes(key)) return;

    const value = data[key];

    if (key === "biz_content" && typeof value === "object" && value !== null) {
      Object.keys(value).forEach((bizKey) => {
        if (!this.excludeFields.includes(bizKey) && value[bizKey] != null) {
          flat[bizKey] = value[bizKey].toString();
        }
      });
    } else if (value != null) {
      flat[key] = value.toString();
    }
  });

  return flat;
}



  /**
   * Generate random nonce string
   */
private generateNonceStr(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    const idx = crypto.randomInt(0, chars.length); // secure random index
    result += chars[idx];
  }
  return result;
}

  /**
   * Get token from Telebirr API
   */
  private async getToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payment/v1/token`,
        { appSecret: this.appSecret },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-APP-Key': this.appTokenId,
          },
          timeout: 30000,
        }
      );

      const data = response.data;
      if (!data.token) {
        throw new Error(`Failed to get token: ${JSON.stringify(data)}`);
      }

      return data.token;
    } catch (error) {
      console.error('❌ Error getting token:', error);
      throw new Error('Failed to get token from Telebirr');
    }
  }

  /**
   * Create RSA signature for request
   */
  


private createSignature(data: string): string {
  try {
    console.log("🔑 Signing string:\n", data);

    //if (!this.privateKey.includes('-----BEGIN') || !this.privateKey.includes('-----END')) {
     // throw new Error('Private key is missing PEM headers');
    //}

    const privateKey = this.privateKey.trim().replace(/\r\n/g, '\n');

    const signature = crypto.sign(
      "sha256",
      Buffer.from(data, "utf8"),
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      }
    ).toString("base64");

    console.log("✅ Generated signature:\n", signature);
    return signature;
  } catch (error: any) {
    console.error("❌ Error creating signature:", error);
    throw new Error(`Failed to create payment signature: ${error.message}`);
  }
}




  
  /**
   * Create order request to Telebirr
   */
  private async createOrder(request: TelebirrPaymentRequest): Promise<string> {
    const token = await this.getToken();
    const nonceStr = this.generateNonceStr();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const merchOrderId = request.orderId.replace(/[^A-Za-z0-9]/g, "");

    // Validate returnUrl
    const urlPattern = /^(https?|ftp):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;\[\]()*]+$/;
    if (!urlPattern.test(request.returnUrl)) {
      console.warn(`Invalid returnUrl: ${request.returnUrl}, using fallback`);
      request.returnUrl = "https://your-default-url.com";
    }

    // Dynamic title
    const title = `Plan ${request.planId} for user`;

// Optional: remove forbidden characters
const safeTitle = title.replace(/[~`!#$%^*()\-=+|\/<>?;:"[\]{}\\&]/g, "");

    const biz_content = {
      appid: this.merchantId,
      merch_code: this.merchantCode,
      merch_order_id: merchOrderId,
      trade_type: "Checkout",
      title,
      total_amount: request.amount.toFixed(2),
      trans_currency: "ETB",
      timeout_express: "120m",
      business_type: "BuyGoods",
      notify_url: this.notifyUrl,
      redirect_url: request.returnUrl,
      //payee_identifier: this.merchantCode, // ✅ use merchantCode env, not hardcoded
      //payee_identifier_type: "04",
      //payee_type: "5000",
      callback_info: "From web"
    };

    const requestData = {
      timestamp,
      nonce_str: nonceStr,
      method: "payment.preorder",
      version: "1.0",
      biz_content,
    };

    // Flatten + sign


    const flatData = this.flattenForSign(requestData);
   // const sortedKeys = Object.keys(flatData).sort();
    //const signString = sortedKeys.map((k) => `${k}=${flatData[k]}`).join("&");
    
const signString = Object.keys(flatData)
  .sort()
  .map(k => `${k}=${decodeURIComponent(flatData[k])}`)
  .join("&");
const signature = this.createSignature(signString);

    const finalRequest = {
      ...requestData,
      sign:signature,
      sign_type:"SHA256WithRSA",
    };

    console.log(`Request: ${JSON.stringify(requestData)}`);
 console.log(`Create Order Request: ${JSON.stringify(finalRequest)}`);
    console.log(`Create Order URL: ${this.baseUrl}/payment/v1/merchant/preOrder`);



  try {
  const response = await axios.post(
    `${this.baseUrl}/payment/v1/merchant/preOrder`,
    finalRequest,
    {
      headers: {
        "Content-Type": "application/json",
        "X-APP-Key": this.appTokenId,
        Authorization: token,
      },
      timeout: 30000,
      transformResponse: [(data) => data], // keep raw string
    }
  );

  // Raw response string
  console.log("⬅️ Raw Response String:", response.data);

  let parsed;
  try {
    parsed = JSON.parse(response.data);
    console.log("⬅️ Parsed JSON Response:", parsed);
  } catch (e) {
    console.error("❌ Failed to parse response JSON:", e.message);
    throw new Error(`Telebirr returned non-JSON response: ${response.data}`);
  }

  if (!parsed.biz_content || !parsed.biz_content.prepay_id) {
    throw new Error(`Telebirr preOrder error: ${JSON.stringify(parsed)}`);
  }

  console.log(`✅ Prepay ID: ${parsed.biz_content.prepay_id}`);
  return parsed.biz_content.prepay_id;

} catch (err: any) {
  if (err.response) {
    console.error("❌ Telebirr Error Response:", {
      status: err.response.status,
      headers: err.response.headers,
      data: err.response.data,
    });
    throw new Error(
      `Telebirr API error ${err.response.status}: ${JSON.stringify(err.response.data)}`
    );
  } else if (err.request) {
    console.error("❌ No response from Telebirr:", err.request);
    throw new Error("No response from Telebirr gateway");
  } else {
    console.error("❌ Request setup error:", err.message);
    throw new Error(`Axios error: ${err.message}`);
  }
}


}
  /**
   * Build raw request string for checkout
   */
  private constructRawRequest(prepayId: string): string {
    const nonceStr = this.generateNonceStr();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const maps: Record<string, string> = {
      appid: this.merchantId,
      merch_code: this.merchantCode,
      nonce_str: nonceStr,
      prepay_id: prepayId,
      timestamp,
    };

    const sortedKeys = Object.keys(maps).sort();
    const queryString = sortedKeys.map(k => `${k}=${maps[k]}`).join('&');
    const signature = this.createSignature(queryString);

    const params = new URLSearchParams(maps);
    params.append('sign', signature);
    params.append('sign_type', 'SHA256WithRSA');

    return params.toString();
  }


  /**
   * Create payment and return checkout details
   */
  async createPayment(request: TelebirrPaymentRequest): Promise<TelebirrPaymentResponse> {
    try {
      console.log('💳 Creating Telebirr payment for order:', request.orderId);

      const prepayId = await this.createOrder(request);
      const rawRequest = this.constructRawRequest(prepayId);
      const checkoutUrl = `${this.checkoutBaseUrl}?${rawRequest}&version=1.0&trade_type=Checkout`;

      console.log('✅ Payment created successfully:', prepayId);

      return {
        prepay_id: prepayId,
        checkout_url: checkoutUrl,
      };
    } catch (error) {
      console.error('❌ Error creating Telebirr payment:', error);
      throw error;
    }
  }
}

// Service instance
const telebirrService = new TelebirrPaymentService();


 // Create Telebirr payment

export async function createTelebirrPayment(
  request: TelebirrPaymentRequest
): Promise<TelebirrPaymentResponse> {
  return telebirrService.createPayment(request);
}

/**
 * Verify Telebirr callback signature
 */
export async function verifyTelebirrCallback(callbackData: any): Promise<boolean> {
  try {
    const { sign, sign_type, ...dataToVerify } = callbackData;

    if (sign_type !== 'SHA256WithRSA') {
      console.error('❌ Invalid signature type:', sign_type);
      return false;
    }

    // Create signature string (alphabetically sorted keys)
    const sortedKeys = Object.keys(dataToVerify).sort();
    const signString = sortedKeys
      .map(key => `${key}=${dataToVerify[key]}`)
      .join('&');

    console.log('🔍 Verifying callback signature...');
    console.log('📝 Sign string:', signString);
    console.log('✏️ Signature:', sign);

    // Verify signature using public key
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signString);
    return verify.verify(telebirrService['publicKey'], sign, 'base64');

  } catch (error) {
    console.error('❌ Error verifying callback:', error);
    return false;
  }
}
