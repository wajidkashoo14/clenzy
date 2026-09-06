import { reportDateRangeQuerySchema } from '@clenzy/shared';
import type { Request, Response } from 'express';
import * as adminReportsService from '../services/adminReports.service.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

function csvResponse(res: Response, filename: string, csv: string): void {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

export const getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const report = await adminReportsService.getRevenueReport(query);
  res.status(200).json({ success: true, data: { report } });
});

export const exportRevenueReportCsv = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const csv = await adminReportsService.getRevenueReportCsv(query);
  csvResponse(res, 'revenue-report.csv', csv);
});

export const getOrdersReport = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const report = await adminReportsService.getOrdersReport(query);
  res.status(200).json({ success: true, data: { report } });
});

export const exportOrdersReportCsv = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const csv = await adminReportsService.getOrdersReportCsv(query);
  csvResponse(res, 'orders-report.csv', csv);
});

export const getCustomersReport = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const report = await adminReportsService.getCustomersReport(query);
  res.status(200).json({ success: true, data: { report } });
});

export const exportCustomersReportCsv = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const csv = await adminReportsService.getCustomersReportCsv(query);
  csvResponse(res, 'customers-report.csv', csv);
});

export const getOperationsReport = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const report = await adminReportsService.getOperationsReport(query);
  res.status(200).json({ success: true, data: { report } });
});

export const exportOperationsReportCsv = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const csv = await adminReportsService.getOperationsReportCsv(query);
  csvResponse(res, 'operations-report.csv', csv);
});

export const getCouponsReport = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const report = await adminReportsService.getCouponsReport(query);
  res.status(200).json({ success: true, data: { report } });
});

export const exportCouponsReportCsv = asyncHandler(async (req: Request, res: Response) => {
  const query = reportDateRangeQuerySchema.parse(req.query);
  const csv = await adminReportsService.getCouponsReportCsv(query);
  csvResponse(res, 'coupons-report.csv', csv);
});
