// API Response Types
export interface ApiResponse<T = any> {
    statusCode: number;
    body: string;
    headers: {
      "Content-Type": string;
      "Access-Control-Allow-Origin": string;
    };
  }
  
  export interface ErrorResponse {
    error: string;
    message: string;
  }
