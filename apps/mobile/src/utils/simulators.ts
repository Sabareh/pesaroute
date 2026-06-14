export type MMFSimulationInput = {
  principal: number;
  annualRatePercent: number;
  months: number;
};

export type TBillSimulationInput = {
  faceValue: number;
  discountRatePercent: number;
  days: number;
};

export type SaccoSimulationInput = {
  monthlyDeposit: number;
  months: number;
  annualDividendPercent: number;
};

export type GlobalRouteSimulationInput = {
  amountKes: number;
  fxRate: number;
  transferFeePercent: number;
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function simulateMMF(input: MMFSimulationInput) {
  const monthlyRate = input.annualRatePercent / 100 / 12;
  const projectedValue = input.principal * (1 + monthlyRate) ** input.months;
  return {
    projectedInterest: roundMoney(projectedValue - input.principal),
    projectedValue: roundMoney(projectedValue)
  };
}

export function simulateTBill(input: TBillSimulationInput) {
  const estimatedDiscountInterest = input.faceValue * (input.discountRatePercent / 100) * (input.days / 364);
  return {
    estimatedDiscountInterest: roundMoney(estimatedDiscountInterest),
    estimatedPurchasePrice: roundMoney(input.faceValue - estimatedDiscountInterest)
  };
}

export function simulateSacco(input: SaccoSimulationInput) {
  const totalContributions = input.monthlyDeposit * input.months;
  const projectedDividend = totalContributions * (input.annualDividendPercent / 100) * (input.months / 12);
  return {
    totalContributions: roundMoney(totalContributions),
    projectedDividend: roundMoney(projectedDividend),
    projectedTotal: roundMoney(totalContributions + projectedDividend)
  };
}

export function simulateGlobalRoute(input: GlobalRouteSimulationInput) {
  const estimatedFeesKes = input.amountKes * (input.transferFeePercent / 100);
  const netKes = input.amountKes - estimatedFeesKes;
  return {
    estimatedFeesKes: roundMoney(estimatedFeesKes),
    estimatedUsdBeforeBrokerCosts: roundMoney(netKes / input.fxRate)
  };
}
