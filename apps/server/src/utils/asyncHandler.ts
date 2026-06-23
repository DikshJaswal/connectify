import type { NextFunction, Request, Response } from "express";

export const asyncHandler =
  <TReq extends Request>(handler: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: TReq, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
