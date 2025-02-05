import axios from "axios";

class ApiService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = `${baseUrl}`;
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async get<T>(url: string): Promise<T> {
    const response = await axios.get(url, {
      headers: this.headers,
    });
    return response.data;
  }

  async post<T>(data: any): Promise<T> {
    try {
      const response = await axios.post(this.baseUrl, data, {
        headers: this.headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      throw new Error("Error sending message");
    }
  }
}

export default ApiService;
