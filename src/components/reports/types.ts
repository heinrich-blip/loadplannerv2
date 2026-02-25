export interface CargoDistribution {
  name: string;
  value: number;
  fill: string;
}

export interface StatusDistribution {
  name: string;
  value: number;
  fill: string;
}

export interface RouteData {
  route: string;
  loads: number;
}

export interface WeeklyTrend {
  week: string;
  scheduled: number;
  inTransit: number;
  delivered: number;
  pending: number;
  total: number;
}

export interface TimeWindowData {
  timeWindow: string;
  count: number;
}

export interface DayOfWeekData {
  day: string;
  loads: number;
}

export interface MonthlyTrend {
  month: string;
  loads: number;
}

export interface TimeVarianceData {
  category: string;
  count: number;
  percentage: number;
  fill: string;
}

export interface LocationVariance {
  location: string;
  avgVariance: number;
  onTimeCount: number;
  lateCount: number;
  earlyCount: number;
  totalLoads: number;
}

export interface BackloadDistribution {
  name: string;
  value: number;
  fill: string;
}

export interface BackloadDestinationData {
  destination: string;
  totalMovements: number;
  bins: number;
  crates: number;
  pallets: number;
}

export interface BackloadWeeklyTrend {
  week: string;
  movements: number;
  bins: number;
  crates: number;
  pallets: number;
}

export interface BackloadMovement {
  loadId: string;
  origin: string;
  destination: string;
  backloadDestination: string;
  cargoType: string;
  offloadingDate: string;
  quantities: {
    bins: number;
    crates: number;
    pallets: number;
  };
  status: string;
  driver?: string;
  notes?: string;
}

export interface BackloadCargoTypeData {
  cargoType: string;
  count: number;
  fill: string;
}

export interface DelayBarRow {
  location: string;
  arrLate: number;
  depLate: number;
  totalLate: number;
}

export interface DailyPunctualityRow {
  date: string;
  loads: number;
  originArrivalAvg?: number | null;
  originDepartureAvg?: number | null;
  destArrivalAvg?: number | null;
  destDepartureAvg?: number | null;
  originDelayCount: number;
  destDelayCount: number;
}

export interface WeeklyPunctualityRow {
  week: string;
  loads: number;
  originArrivalAvg?: number | null;
  originDepartureAvg?: number | null;
  destArrivalAvg?: number | null;
  destDepartureAvg?: number | null;
  originDelayCount: number;
  destDelayCount: number;
}

export interface TimeVarianceAnalysis {
  distribution: TimeVarianceData[];
  onTimeRate: number;
  avgDestVariance: number;
  avgOriginVariance: number;
  totalAnalyzed: number;
  noDataCount: number;
  routePerformance: LocationVariance[];
  lateCount: number;
  earlyCount: number;
  onTimeCount: number;
}

export interface BackloadSummaryStats {
  totalMovements: number;
  totalBins: number;
  totalCrates: number;
  totalPallets: number;
  totalPackaging: number;
  deliveredCount: number;
  deliveryRate: number;
  uniqueDestinations: number;
}

export interface BackloadRouteAnalysisItem {
  route: string;
  count: number;
  bins: number;
  crates: number;
  pallets: number;
  totalPackaging: number;
}

export interface ClientFeedbackReportItem {
  id: string;
  clientName: string;
  clientEmail: string | null;
  loadId: string;
  route: string;
  offloadingDate: string;
  rating: 'happy' | 'unhappy';
  comment: string | null;
  createdAt: string;
}

export interface ClientFeedbackSummary {
  totalFeedback: number;
  happyCount: number;
  unhappyCount: number;
  unhappyPercentage: number;
  feedbackItems: ClientFeedbackReportItem[];
}