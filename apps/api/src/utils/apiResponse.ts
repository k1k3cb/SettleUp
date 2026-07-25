import type { Response } from "express";

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode: number = 200) {
    return res.status(statusCode).json({ status: "success", data });
  }

  static created<T>(res: Response, data: T) {
    return this.success(res, data, 201);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}
