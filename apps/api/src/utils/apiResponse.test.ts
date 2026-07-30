import { describe, it, expect, vi } from "vitest";
import { ApiResponse } from "./apiResponse.js";

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Parameters<typeof ApiResponse.success>[0];
}

describe("ApiResponse", () => {
  it("success devuelve 200 con formato { status, data }", () => {
    const res = mockRes();
    ApiResponse.success(res, { x: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: "success", data: { x: 1 } });
  });

  it("success acepta status code custom", () => {
    const res = mockRes();
    ApiResponse.success(res, { x: 1 }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("created siempre usa 201", () => {
    const res = mockRes();
    ApiResponse.created(res, { x: 1 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("noContent devuelve 204 con body vacío", () => {
    const res = mockRes();
    ApiResponse.noContent(res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});
