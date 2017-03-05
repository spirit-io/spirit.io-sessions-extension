import { Request, Response, NextFunction } from "express";

export interface IAuthModule {
    authenticate(req: Request, res: Response, next: NextFunction): string;
}