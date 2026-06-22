import { FormEvent, useEffect, useMemo, useState } from "react";

type Vehicle = {
  vehicleId: string;
  vehicleName: string;
  listPrice: number;
  fuelType: string;
  co2Emissions: number | null;
  electricRange: number | null;
  isOnOffer?: boolean;
};

type VehicleType = {
  vehicleType: string;
  vehicleCount: number;
};

type Employer = {
  employerId: number;
  organisation: string;
  adminFee: number;
  insuranceFee: number;
};

type IncomeTaxRate = {
  taxBand: string;
  taxRate: number;
};

type PensionRate = {
  tier: string;
  earningsFrom: number;
  earningsTo: number | null;
  contributionPercentage: number;
};

type NIRate = {
  niLetter: string;
  employeeRateLower: number;
  employeeRateUpper: number;
  employerRate: number;
  class1ARate: number;
  employerPensionRate: number;
  vatRate: number;
};

type NationalMinimumWageRate = {
  nmwRateId: number;
  ageBand: string;
  hourlyRate: number;
  effectiveFrom: string;
  displayOrder: number;
};

type AgendaForChangePayRate = {
  afcPayRateId: number;
  band: string;
  annualSalary: number;
  effectiveFrom: string;
  displayOrder: number;
};

type BenefitRate = {
  benefitInKindPercentage: number;
};

type CO2Rate = BenefitRate & {
  co2From: number;
  co2To: number;
};

type ElectricMileageRate = BenefitRate & {
  electricMileageFrom: number;
  electricMileageTo: number;
};

type VehicleRentalRate = {
  vehicleRentalRateId: number;
  vehicleId: number;
  annualMileage: number;
  providerCode: string;
  annualRental: number;
  effectiveAt?: string;
  externalQuoteReference?: string | null;
};

type AdminVehicle = Omit<Vehicle, "vehicleId"> & {
  vehicleId: number;
  rentalCount: number;
};

type QuoteResult = {
  quoteReference?: number;
  quoteCreatedAt?: string;
  vehicle: Vehicle;
  annualRental: number;
  salarySacrificeAnnual: number;
  salarySacrificeMonthly: number;
  taxSavingAnnual: number;
  niSavingAnnual: number;
  pensionSavingAnnual: number;
  companyCarTaxAnnual: number;
  netAnnual: number;
  netMonthly: number;
  bikRate: number;
  bikSource: string;
  nmwSkipped: boolean;
  nmwBlocked: boolean;
  nmwHourlyRate: number | null;
  nmwMinimumRate: number | null;
};

type StoredQuoteSummary = {
  quoteReference: number;
  createdAt: string;
  clientIpAddress: string | null;
  deviceType: string | null;
  browserName: string | null;
  employer: string | null;
  vehicleName: string;
  fuelType: string | null;
  annualMileage: number;
  salarySacrificeMonthly: number;
  costToDriverMonthly: number;
  nmwBlocked: boolean;
  nmwSkipped: boolean;
};

type StoredQuoteDetail = StoredQuoteSummary & {
  userAgent: string | null;
  vehicleId: number;
  listPrice: number;
  co2Emissions: number | null;
  electricRange: number | null;
  bikRate: number;
  bikSource: string | null;
  annualRental: number;
  insurance: number;
  adminFees: number;
  vat: number;
  salarySacrificeAnnual: number;
  taxableBenefit: number;
  savingsOnPaye: number;
  savingsOnNi: number;
  savingsOnPension: number;
  companyCarTax: number;
  costToDriverAnnual: number;
  ni1aCost: number;
  employerNiSavings: number;
  employerPensionSavings: number;
  totalEmployerSavings: number;
  nmwHourlyRate: number | null;
  nmwMinimumRate: number | null;
  nmwSalaryUsed: number | null;
  nmwRevisedFullTimeSalary: number | null;
  nmwWholeTimeHours: number | null;
  nmwContractedHours: number | null;
  nmwAdjustedAnnualEarnings: number | null;
  nmwResult: string | null;
};

type AdminField = {
  key: string;
  label: string;
  type?: "text" | "number";
  step?: string;
  readonlyOnEdit?: boolean;
  optional?: boolean;
};

type AdminTableConfig = {
  slug: string;
  title: string;
  description: string;
  idKey: string;
  fields: AdminField[];
  emptyRow: Record<string, string | number | null>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?? "https://1g0vserusc.execute-api.eu-west-2.amazonaws.com";
const APP_BUILD = "2026-06-22-tax-estimator";
const FLEET_MANAGEMENT_EMAIL = "fleet.management@swyt.nhs.uk";

function BrandHeader() {
  return (
    <header className="brand-header">
      <div className="nhs-mark" aria-label="NHS">NHS</div>
      <div>
        <div className="brand-name">CARculator</div>
        <div className="brand-subtitle">Lease car salary sacrifice calculator</div>
      </div>
    </header>
  );
}

function CopyrightFooter() {
  return (
    <footer className="site-footer" data-build={APP_BUILD}>
      © {new Date().getFullYear()} South West Yorkshire Teaching Partnership NHS FT
    </footer>
  );
}

function PrivacyNotice() {
  return (
    <div className="notice privacy-notice">
      <h3>Privacy notice</h3>
      <p>
        CARculator stores the quote details, quote reference, date and time, IP address, and browser/device information
        for audit and support purposes. We do not store your name, employee number, or email address.
      </p>
    </div>
  );
}

const adminTables: AdminTableConfig[] = [
  {
    slug: "employers",
    title: "Employers",
    description: "Admin fee and insurance values used in quote calculations.",
    idKey: "employerId",
    fields: [
      { key: "organisation", label: "Organisation" },
      { key: "adminFee", label: "Admin fee", type: "number", step: "0.01" },
      { key: "insuranceFee", label: "Insurance fee", type: "number", step: "0.01" }
    ],
    emptyRow: { organisation: "", adminFee: 0, insuranceFee: 0 }
  },
  {
    slug: "pension-rates",
    title: "Pension",
    description: "Employee pension tiers by earnings band.",
    idKey: "tier",
    fields: [
      { key: "tier", label: "Tier", readonlyOnEdit: true },
      { key: "earningsFrom", label: "Earnings from", type: "number", step: "0.01" },
      { key: "earningsTo", label: "Earnings to", type: "number", step: "0.01", optional: true },
      { key: "contributionPercentage", label: "Contribution %", type: "number", step: "0.01" }
    ],
    emptyRow: { tier: "", earningsFrom: 0, earningsTo: "", contributionPercentage: 0 }
  },
  {
    slug: "co2-rates",
    title: "CO2 Rates",
    description: "Benefit-in-kind percentage bands for petrol, diesel and standard vehicles.",
    idKey: "co2RateId",
    fields: [
      { key: "co2From", label: "CO2 from", type: "number", step: "1" },
      { key: "co2To", label: "CO2 to", type: "number", step: "1" },
      { key: "benefitInKindPercentage", label: "BIK %", type: "number", step: "0.01" }
    ],
    emptyRow: { co2From: 0, co2To: 0, benefitInKindPercentage: 0 }
  },
  {
    slug: "electric-mileage-rates",
    title: "Electric Mileage",
    description: "Benefit-in-kind percentage bands based on electric range.",
    idKey: "electricMileageRateId",
    fields: [
      { key: "electricMileageFrom", label: "Range from", type: "number", step: "0.01" },
      { key: "electricMileageTo", label: "Range to", type: "number", step: "0.01" },
      { key: "benefitInKindPercentage", label: "BIK %", type: "number", step: "0.01" }
    ],
    emptyRow: { electricMileageFrom: 0, electricMileageTo: 0, benefitInKindPercentage: 0 }
  },
  {
    slug: "ni-rates",
    title: "NI Rates",
    description: "Employee, employer, pension, Class 1A and VAT rates.",
    idKey: "niLetter",
    fields: [
      { key: "niLetter", label: "NI letter", readonlyOnEdit: true },
      { key: "employeeRateLower", label: "EEs lower", type: "number", step: "0.000001" },
      { key: "employeeRateUpper", label: "EEs upper", type: "number", step: "0.000001" },
      { key: "employerRate", label: "ERs rate", type: "number", step: "0.000001" },
      { key: "class1ARate", label: "NI 1A rate", type: "number", step: "0.000001" },
      { key: "employerPensionRate", label: "ERs pension", type: "number", step: "0.000001" },
      { key: "vatRate", label: "VAT", type: "number", step: "0.000001" }
    ],
    emptyRow: {
      niLetter: "",
      employeeRateLower: 0,
      employeeRateUpper: 0,
      employerRate: 0,
      class1ARate: 0,
      employerPensionRate: 0,
      vatRate: 0
    }
  },
  {
    slug: "income-tax-rates",
    title: "Income Tax",
    description: "Income tax rates used for salary-sacrifice savings calculations.",
    idKey: "taxBand",
    fields: [
      { key: "taxBand", label: "Taxable pay", readonlyOnEdit: true },
      { key: "taxRate", label: "Tax rate", type: "number", step: "0.000001" }
    ],
    emptyRow: { taxBand: "", taxRate: 0 }
  },
  {
    slug: "national-minimum-wage-rates",
    title: "NMW Rates",
    description: "National Minimum Wage hourly rates by age band.",
    idKey: "nmwRateId",
    fields: [
      { key: "ageBand", label: "Age band" },
      { key: "hourlyRate", label: "Hourly rate", type: "number", step: "0.01" },
      { key: "effectiveFrom", label: "Effective from" },
      { key: "displayOrder", label: "Display order", type: "number", step: "1" }
    ],
    emptyRow: { ageBand: "", hourlyRate: 0, effectiveFrom: "2026-04-01", displayOrder: 0 }
  },
  {
    slug: "agenda-for-change-pay-rates",
    title: "AfC Pay",
    description: "Agenda for Change annual pay rates used for NMW checks.",
    idKey: "afcPayRateId",
    fields: [
      { key: "band", label: "Band" },
      { key: "annualSalary", label: "Annual salary", type: "number", step: "0.01" },
      { key: "effectiveFrom", label: "Effective from" },
      { key: "displayOrder", label: "Display order", type: "number", step: "1" }
    ],
    emptyRow: { band: "", annualSalary: 0, effectiveFrom: "2026-04-01", displayOrder: 0 }
  }
];

const mileageOptions = [6000, 8000, 10000, 12000, 15000];
const monthlyCostOptions = Array.from({ length: 16 }, (_, index) => 250 + index * 50);

function currency(value: number) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2
  });
}

function percent(value: number) {
  return `${(normaliseRate(value) * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

function normaliseRate(value: number) {
  return value > 1 ? value / 100 : value;
}

function pensionLabel(rate: PensionRate) {
  const from = currency(rate.earningsFrom);
  const to = rate.earningsTo === null ? "and above" : `to ${currency(rate.earningsTo)}`;
  return `${rate.tier}: ${from} ${to} (${percent(rate.contributionPercentage)})`;
}

function afcLabel(rate: AgendaForChangePayRate) {
  return `Band ${rate.band} — ${currency(rate.annualSalary)}`;
}

function incomeTaxLabel(rate: IncomeTaxRate) {
  return `${rate.taxBand} (${percent(rate.taxRate)})`;
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(/[£,\s]/g, ""));
}

function allowanceFromTaxCode(taxCode: string) {
  const code = taxCode.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return { allowance: 12570, note: "No tax code entered, so the standard 1257L allowance has been assumed." };
  if (code === "BR") return { allowance: 0, forcedRate: 0.2, note: "BR tax codes normally mean all pay is taxed at 20%." };
  if (code === "D0") return { allowance: 0, forcedRate: 0.4, note: "D0 tax codes normally mean all pay is taxed at 40%." };
  if (code === "D1") return { allowance: 0, forcedRate: 0.45, note: "D1 tax codes normally mean all pay is taxed at 45%." };
  if (code === "NT") return { allowance: 0, forcedRate: 0, note: "NT tax codes usually mean no tax is deducted. Please check this with Payroll." };
  const digits = code.match(/\d+/)?.[0];
  if (!digits) return { allowance: 12570, note: "The tax code could not be read, so the standard 1257L allowance has been assumed." };
  const allowance = Number(digits) * 10;
  if (code.startsWith("K")) {
    return { allowance: 0, note: "K tax codes are more complex. This estimate treats the personal allowance as £0, so please check the result carefully." };
  }
  return { allowance, note: `Estimated personal allowance from tax code ${code}: ${currency(allowance)}.` };
}

const payslipMonthOptions = [
  { label: "April", monthNumber: 1 },
  { label: "May", monthNumber: 2 },
  { label: "June", monthNumber: 3 },
  { label: "July", monthNumber: 4 },
  { label: "August", monthNumber: 5 },
  { label: "September", monthNumber: 6 },
  { label: "October", monthNumber: 7 },
  { label: "November", monthNumber: 8 },
  { label: "December", monthNumber: 9 },
  { label: "January", monthNumber: 10 },
  { label: "February", monthNumber: 11 },
  { label: "March", monthNumber: 12 }
];

function estimateTaxBand(taxCode: string, payslipMonth: number, yearToDateTaxablePay: string, yearToDateTaxPaid: string) {
  const taxablePay = parseCurrencyInput(yearToDateTaxablePay);
  const taxPaid = parseCurrencyInput(yearToDateTaxPaid);
  if (!Number.isFinite(taxablePay) || taxablePay <= 0) return null;
  if (!Number.isFinite(taxPaid) || taxPaid < 0) return null;

  const taxCodeDetails = allowanceFromTaxCode(taxCode);
  const monthNumber = Math.min(12, Math.max(1, payslipMonth || 1));
  const fraction = monthNumber / 12;
  const allowanceUsedToDate = Number(taxCodeDetails.allowance) * fraction;
  const taxablePayAfterAllowance = Math.max(0, taxablePay - allowanceUsedToDate);
  const effectiveTaxedPayRate = taxablePayAfterAllowance > 0 ? taxPaid / taxablePayAfterAllowance : 0;
  const estimatedAnnualTaxablePay = taxablePay / fraction;
  const estimatedAnnualTaxedPay = taxablePayAfterAllowance / fraction;
  const estimatedAnnualTaxPaid = taxPaid / fraction;

  let estimatedRate = taxCodeDetails.forcedRate ?? 0.2;
  if (taxCodeDetails.forcedRate === undefined) {
    if (estimatedAnnualTaxablePay > 125140 || effectiveTaxedPayRate >= 0.42) {
      estimatedRate = 0.45;
    } else if (estimatedAnnualTaxedPay > 37700 || effectiveTaxedPayRate > 0.22) {
      estimatedRate = 0.4;
    }
  }

  return {
    estimatedRate,
    taxCodeNote: taxCodeDetails.note,
    payslipMonth: payslipMonthOptions.find((option) => option.monthNumber === monthNumber)?.label ?? "Selected month",
    taxYearMonthsUsed: monthNumber,
    allowanceUsedToDate,
    taxablePayAfterAllowance,
    estimatedAnnualTaxablePay,
    estimatedAnnualTaxedPay,
    estimatedAnnualTaxPaid,
    effectiveTaxRateToDate: taxablePay > 0 ? taxPaid / taxablePay : 0,
    effectiveTaxedPayRate
  };
}

function isElectricHybrid(vehicle: Vehicle) {
  const fuel = vehicle.fuelType.toLowerCase();
  return fuel.includes("hybrid") && !fuel.includes("mild") && Number(vehicle.electricRange ?? 0) > 0;
}

function VehiclePicker({
  index,
  value,
  onChange,
  excludedIds,
  vehicleType,
  maxMonthlyCost,
  annualMileage,
  costFilter,
  quoteApiKey
}: {
  index: number;
  value: Vehicle | null;
  onChange: (vehicle: Vehicle | null) => void;
  excludedIds: string[];
  vehicleType: string;
  maxMonthlyCost: string;
  annualMileage: number;
  costFilter: {
    adminFee: number;
    insuranceFee: number;
    taxRate: number;
    niRate: number;
    pensionRate: number;
    vatRate: number;
  };
  quoteApiKey: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Vehicle[]>([]);
  const [searching, setSearching] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
    setResults([]);
  }, [query, vehicleType, maxMonthlyCost, annualMileage]);

  useEffect(() => {
    if (!listOpen || value) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          search: query.trim(),
          limit: "100",
          page: String(page)
        });
        if (vehicleType) params.set("fuelType", vehicleType);
        params.set("annualMileage", String(annualMileage));
        if (maxMonthlyCost) params.set("maxMonthlyCost", maxMonthlyCost);
        params.set("adminFee", String(costFilter.adminFee));
        params.set("insuranceFee", String(costFilter.insuranceFee));
        params.set("taxRate", String(costFilter.taxRate));
        params.set("niRate", String(costFilter.niRate));
        params.set("pensionRate", String(costFilter.pensionRate));
        params.set("vatRate", String(costFilter.vatRate));
        const response = await fetch(`${API_BASE_URL}/vehicles?${params}`, {
          signal: controller.signal,
          headers: { "x-quote-api-key": quoteApiKey }
        });
        if (response.ok) {
          const body = await response.json();
          const available = body.items.filter((vehicle: Vehicle) => !excludedIds.includes(vehicle.vehicleId));
          setResults((current) => {
            const combined = page === 1 ? available : [...current, ...available];
            return combined.filter(
              (vehicle, vehicleIndex) =>
                combined.findIndex((item) => item.vehicleId === vehicle.vehicleId) === vehicleIndex
            );
          });
          setTotal(Number(body.total));
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value, vehicleType, maxMonthlyCost, annualMileage, costFilter.adminFee, costFilter.insuranceFee, costFilter.taxRate, costFilter.niRate, costFilter.pensionRate, costFilter.vatRate, excludedIds.join(","), listOpen, page]);

  return (
    <div className="vehicle-picker">
      <label htmlFor={`vehicle-${index}`}>Vehicle choice {index + 1}{index === 0 ? " *" : ""}</label>
      {value ? (
        <div className="selected-vehicle">
          <div>
            <strong>{value.vehicleName}</strong>
            <span>{value.fuelType} · £{value.listPrice.toLocaleString("en-GB")}</span>
          </div>
          <button type="button" className="text-button" onClick={() => { onChange(null); setQuery(""); }}>
            Remove
          </button>
        </div>
      ) : (
        <>
          <input
            id={`vehicle-${index}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setListOpen(true)}
            placeholder={vehicleType ? `Search or browse ${vehicleType.toLowerCase()} vehicles` : "Search or browse all vehicles"}
            autoComplete="off"
          />
          {listOpen && (
            <div
              className="search-results"
              onScroll={(event) => {
                const list = event.currentTarget;
                const nearBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 80;
                if (nearBottom && !searching && page * 100 < total) {
                  setPage((current) => current + 1);
                }
              }}
            >
              <div className="search-results-summary">
                {searching && results.length === 0
                  ? "Loading vehicles…"
                  : `${total.toLocaleString("en-GB")} vehicle${total === 1 ? "" : "s"} available`}
              </div>
              {results.map((vehicle) => (
                <button
                  type="button"
                  key={vehicle.vehicleId}
                  onClick={() => {
                    onChange(vehicle);
                    setQuery("");
                    setResults([]);
                    setListOpen(false);
                  }}
                >
                  <strong>{vehicle.vehicleName}</strong>
                  <span>{vehicle.fuelType} · £{vehicle.listPrice.toLocaleString("en-GB")}</span>
                </button>
              ))}
              {searching && results.length > 0 && (
                <div className="search-results-summary">Loading more vehicles…</div>
              )}
              {!searching && results.length === 0 && (
                <div className="search-results-summary">No matching vehicles found.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QuoteRequestPage({ quoteApiKey }: { quoteApiKey: string }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [incomeTaxRates, setIncomeTaxRates] = useState<IncomeTaxRate[]>([]);
  const [pensionRates, setPensionRates] = useState<PensionRate[]>([]);
  const [niRates, setNIRates] = useState<NIRate[]>([]);
  const [nationalMinimumWageRates, setNationalMinimumWageRates] = useState<NationalMinimumWageRate[]>([]);
  const [agendaForChangePayRates, setAgendaForChangePayRates] = useState<AgendaForChangePayRate[]>([]);
  const [co2Rates, setCO2Rates] = useState<CO2Rate[]>([]);
  const [electricMileageRates, setElectricMileageRates] = useState<ElectricMileageRate[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [taxBand, setTaxBand] = useState("");
  const [paysPension, setPaysPension] = useState("");
  const [pensionTier, setPensionTier] = useState("");
  const [skipNMW, setSkipNMW] = useState(false);
  const [ageBand, setAgeBand] = useState("");
  const [isAgendaForChange, setIsAgendaForChange] = useState("yes");
  const [afcPayRateId, setAFCPayRateId] = useState("");
  const [fullTimeAnnualSalary, setFullTimeAnnualSalary] = useState("");
  const [contractedHours, setContractedHours] = useState("37.5");
  const [wholeTimeHours, setWholeTimeHours] = useState("37.5");
  const [annualMileage, setAnnualMileage] = useState(6000);
  const [vehicleType, setVehicleType] = useState("");
  const [maxMonthlyCost, setMaxMonthlyCost] = useState("");
  const [vehicles, setVehicles] = useState<(Vehicle | null)[]>([null, null, null, null, null]);
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [selectedOrderResult, setSelectedOrderResult] = useState<QuoteResult | null>(null);
  const [selectedBreakdownResult, setSelectedBreakdownResult] = useState<QuoteResult | null>(null);
  const [orderForm, setOrderForm] = useState({
    fullName: "",
    emailAddress: "",
    bodyColour: "",
    interiorColour: "",
    optionalExtras: "",
    earliestDeliveryDate: "",
    replacementRegistration: ""
  });
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "error"; message?: string }>({ type: "loading" });

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const endpoints = [
          "employers",
          "income-tax-rates",
          "pension-rates",
          "ni-rates",
          "national-minimum-wage-rates",
          "agenda-for-change-pay-rates",
          "co2-rates",
          "electric-mileage-rates",
          "vehicle-types"
        ];
        const responses = await Promise.all(endpoints.map((endpoint) =>
          fetch(`${API_BASE_URL}/${endpoint}`, {
            headers: { "x-quote-api-key": quoteApiKey }
          })
        ));
        if (responses.some((response) => !response.ok)) throw new Error("Reference data is temporarily unavailable.");
        const [employerBody, taxBody, pensionBody, niBody, nmwBody, afcBody, co2Body, electricBody, vehicleTypesBody] = await Promise.all(
          responses.map((response) => response.json())
        );
        setEmployers(employerBody.items);
        setIncomeTaxRates(taxBody.items);
        setPensionRates(pensionBody.items);
        setNIRates(niBody.items);
        setNationalMinimumWageRates(nmwBody.items);
        setAgendaForChangePayRates(afcBody.items);
        setCO2Rates(co2Body.items);
        setElectricMileageRates(electricBody.items);
        setVehicleTypes(vehicleTypesBody.items);
        setEmployerId(String(employerBody.items[0]?.employerId ?? ""));
        setTaxBand(String(taxBody.items[0]?.taxBand ?? ""));
        setPensionTier(String(pensionBody.items[0]?.tier ?? ""));
        const defaultAgeBand = nmwBody.items.find((rate: NationalMinimumWageRate) => {
          const ageBand = rate.ageBand.toLowerCase();
          return ageBand.includes("21") && (ageBand.includes("over") || ageBand.includes("above"));
        });
        setAgeBand(String(defaultAgeBand?.ageBand ?? nmwBody.items[0]?.ageBand ?? ""));
        setAFCPayRateId(String(afcBody.items[0]?.afcPayRateId ?? ""));
        setStatus({ type: "idle" });
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "The calculator is temporarily unavailable."
        });
      }
    }
    void loadReferenceData();
  }, [quoteApiKey]);

  const selectedEmployer = employers.find((employer) => String(employer.employerId) === employerId);
  const selectedTaxRate = incomeTaxRates.find((rate) => rate.taxBand === taxBand);
  const selectedPensionRate = pensionRates.find((rate) => rate.tier === pensionTier);
  const selectedNMWRate = nationalMinimumWageRates.find((rate) => rate.ageBand === ageBand);
  const selectedAFCPayRate = agendaForChangePayRates.find((rate) => String(rate.afcPayRateId) === afcPayRateId);
  const selectedNI = niRates[0];
  const selectedIds = vehicles.filter((vehicle): vehicle is Vehicle => vehicle !== null).map((vehicle) => vehicle.vehicleId);
  const selectedTaxRateValue = normaliseRate(selectedTaxRate?.taxRate ?? 0);
  const selectedNIRateValue = selectedTaxRateValue >= 0.4
    ? normaliseRate(selectedNI?.employeeRateUpper ?? 0)
    : normaliseRate(selectedNI?.employeeRateLower ?? 0);
  const selectedPensionRateValue = paysPension === "yes" && selectedPensionRate
    ? normaliseRate(selectedPensionRate.contributionPercentage)
    : 0;
  const vehicleCostFilter = {
    adminFee: Number(selectedEmployer?.adminFee ?? 0),
    insuranceFee: Number(selectedEmployer?.insuranceFee ?? 0),
    taxRate: selectedTaxRateValue,
    niRate: selectedNIRateValue,
    pensionRate: selectedPensionRateValue,
    vatRate: normaliseRate(selectedNI?.vatRate ?? 0)
  };

  function updateVehicle(index: number, vehicle: Vehicle | null) {
    setVehicles((current) => current.map((item, itemIndex) => itemIndex === index ? vehicle : item));
  }

  function validateDetails() {
    if (!selectedEmployer) return "Please choose your employer.";
    if (!selectedTaxRate) return "Please choose your income tax level.";
    if (paysPension !== "yes" && paysPension !== "no") return "Please tell us whether you pay into the pension scheme.";
    if (paysPension === "yes" && !selectedPensionRate) return "Please choose your pensionable earnings band.";
    return "";
  }

  function validateNMW() {
    if (skipNMW) return "";
    if (!selectedNMWRate) return "Please choose your age range.";
    if (isAgendaForChange === "yes" && !selectedAFCPayRate) {
      return "Please choose your Agenda for Change band and annual salary.";
    }
    const salary = isAgendaForChange === "yes"
      ? Number(selectedAFCPayRate?.annualSalary)
      : Number(fullTimeAnnualSalary);
    if (!Number.isFinite(salary) || salary <= 0) return "Please enter a valid full-time annual salary.";
    const contracted = Number(contractedHours);
    if (!Number.isFinite(contracted) || contracted <= 0 || contracted > 80) {
      return "Please enter contracted hours between 1 and 80.";
    }
    const wholeTime = Number(wholeTimeHours);
    if (!Number.isFinite(wholeTime) || wholeTime <= 0 || wholeTime > 80) {
      return "Please enter whole-time hours between 1 and 80.";
    }
    if (contracted > wholeTime) return "Contracted hours cannot be greater than whole-time hours.";
    return "";
  }

  function calculateNMWHourlyRate(salarySacrificeAnnual: number) {
    const annualSalary = isAgendaForChange === "yes"
      ? Number(selectedAFCPayRate?.annualSalary)
      : Number(fullTimeAnnualSalary);
    if (skipNMW || !selectedNMWRate || !Number.isFinite(annualSalary) || annualSalary <= 0) {
      return { skipped: true, blocked: false, hourlyRate: null, minimumRate: null };
    }
    const contracted = Number(contractedHours);
    const wholeTime = Number(wholeTimeHours);
    const annualFullTimeAfterSacrifice = annualSalary - salarySacrificeAnnual;
    const annualPartTimeEarnings = (annualFullTimeAfterSacrifice / wholeTime) * contracted;
    const hourlyRate = annualPartTimeEarnings / 52.1428 / contracted;
    const minimumRate = Number(selectedNMWRate.hourlyRate);
    return {
      skipped: false,
      blocked: hourlyRate < minimumRate,
      hourlyRate,
      minimumRate
    };
  }

  function updateOrderForm(field: keyof typeof orderForm, value: string) {
    setOrderForm((current) => ({ ...current, [field]: value }));
  }

  function sendFleetEmail() {
    if (!selectedOrderResult) return;
    const result = selectedOrderResult;
    const extras = orderForm.optionalExtras.trim() || "None specified";
    const nmwStatus = result.nmwSkipped
      ? "Eligibility subject to National Minimum Wage check"
      : "National Minimum Wage check completed in CARculator";
    const rows = [
      ["Quote reference", result.quoteReference ? String(result.quoteReference) : "Not available"],
      ["Full name", orderForm.fullName],
      ["Email address", orderForm.emailAddress],
      ["Vehicle", result.vehicle.vehicleName],
      ["Fuel type", result.vehicle.fuelType],
      ["Employer", selectedEmployer?.organisation ?? "Not selected"],
      ["Annual mileage", `${annualMileage.toLocaleString("en-GB")} miles`],
      ["List price", currency(result.vehicle.listPrice)],
      ["BIK rate", `${percent(result.bikRate)} (${result.bikSource})`],
      ["Monthly salary sacrifice", currency(result.salarySacrificeMonthly)],
      ["Estimated monthly cost", currency(result.netMonthly)],
      ["NMW status", nmwStatus],
      ["Body colour", orderForm.bodyColour],
      ["Interior colour/trim", orderForm.interiorColour],
      ["Optional extras", extras],
      ["Earliest delivery date", orderForm.earliestDeliveryDate],
      ["Registration number of old car if replacement lease vehicle", orderForm.replacementRegistration.trim() || "Not applicable"]
    ];
    const body = [
      "I am interested in ordering the following vehicle.",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      "Please prepare a revised quote, including any optional extras, and advise on the next steps for ordering the vehicle."
    ].join("\n");
    const subject = `Lease car order request - ${result.vehicle.vehicleName}`;
    window.location.href = `mailto:${FLEET_MANAGEMENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function quoteBreakdown(result: QuoteResult) {
    const annualRental = Number(result.annualRental);
    const insurance = Number(selectedEmployer?.insuranceFee ?? 0);
    const adminFees = Number(selectedEmployer?.adminFee ?? 0);
    const vat = (annualRental + insurance + adminFees) * normaliseRate(selectedNI?.vatRate ?? 0);
    const salarySacrifice = annualRental + insurance + adminFees + vat;
    const taxableBenefit = Number(result.vehicle.listPrice) * result.bikRate;
    const savingsOnPaye = result.taxSavingAnnual;
    const savingsOnNi = result.niSavingAnnual;
    const savingsOnPension = result.pensionSavingAnnual;
    const companyCarTax = result.companyCarTaxAnnual;
    const costToDriver = result.netAnnual;
    const ni1aCost = taxableBenefit * normaliseRate(selectedNI?.class1ARate ?? 0);
    const employerNiSavings = salarySacrifice * normaliseRate(selectedNI?.employerRate ?? 0);
    const employerPensionSavings = salarySacrifice * normaliseRate(selectedNI?.employerPensionRate ?? 0);
    const totalEmployerSavings = employerNiSavings + employerPensionSavings - ni1aCost;

    return {
      main: [
        ["Annual Rental", annualRental],
        ["Insurance", insurance],
        ["Admin Fees", adminFees],
        ["VAT", vat],
        ["Salary Sacrifice", salarySacrifice, true],
        ["Taxable Benefit", taxableBenefit],
        ["Savings on PAYE", savingsOnPaye],
        ["Savings on NI", savingsOnNi],
        ["Savings on Pension", savingsOnPension],
        ["Company Car Tax", companyCarTax],
        ["Cost to Driver", costToDriver, true]
      ] as const,
      employer: [
        ["NI 1A Cost", ni1aCost],
        ["ERs NI Savings", employerNiSavings],
        ["ERs Pension Savings", employerPensionSavings],
        ["Total Employer Savings", totalEmployerSavings, true]
      ] as const
    };
  }

  function nmwBreakdown(result: QuoteResult) {
    if (result.nmwSkipped) {
      return {
        skipped: true,
        rows: [["Status", "Eligibility subject to National Minimum Wage check"]]
      };
    }
    const annualSalary = isAgendaForChange === "yes"
      ? Number(selectedAFCPayRate?.annualSalary)
      : Number(fullTimeAnnualSalary);
    const contracted = Number(contractedHours);
    const wholeTime = Number(wholeTimeHours);
    const revisedFullTimeSalary = annualSalary - result.salarySacrificeAnnual;
    const annualPartTimeEarnings = (revisedFullTimeSalary / wholeTime) * contracted;
    const hourlyRate = annualPartTimeEarnings / 52.1428 / contracted;
    const minimumRate = Number(selectedNMWRate?.hourlyRate ?? 0);
    return {
      skipped: false,
      rows: [
        ["Salary used", currency(annualSalary)],
        ["Less annual salary sacrifice", currency(result.salarySacrificeAnnual)],
        ["Revised full-time equivalent salary", currency(revisedFullTimeSalary)],
        ["Full-time equivalent weekly hours/sessions", wholeTime.toLocaleString("en-GB")],
        ["Weekly contracted hours/sessions", contracted.toLocaleString("en-GB")],
        ["Adjusted annual earnings for contracted hours", currency(annualPartTimeEarnings)],
        ["Calculated hourly rate", currency(hourlyRate)],
        ["National Minimum Wage rate", currency(minimumRate)],
        ["Result", hourlyRate < minimumRate ? "Below National Minimum Wage" : "Above National Minimum Wage"]
      ]
    };
  }

  function quoteStoragePayload(result: QuoteResult) {
    const annualRental = Number(result.annualRental);
    const insurance = Number(selectedEmployer?.insuranceFee ?? 0);
    const adminFees = Number(selectedEmployer?.adminFee ?? 0);
    const vat = (annualRental + insurance + adminFees) * normaliseRate(selectedNI?.vatRate ?? 0);
    const salarySacrifice = annualRental + insurance + adminFees + vat;
    const taxableBenefit = Number(result.vehicle.listPrice) * result.bikRate;
    const ni1aCost = taxableBenefit * normaliseRate(selectedNI?.class1ARate ?? 0);
    const employerNiSavings = salarySacrifice * normaliseRate(selectedNI?.employerRate ?? 0);
    const employerPensionSavings = salarySacrifice * normaliseRate(selectedNI?.employerPensionRate ?? 0);
    const totalEmployerSavings = employerNiSavings + employerPensionSavings - ni1aCost;
    const nmw = nmwBreakdown(result);
    const annualSalary = result.nmwSkipped
      ? null
      : isAgendaForChange === "yes"
        ? Number(selectedAFCPayRate?.annualSalary)
        : Number(fullTimeAnnualSalary);
    const contracted = result.nmwSkipped ? null : Number(contractedHours);
    const wholeTime = result.nmwSkipped ? null : Number(wholeTimeHours);
    const revisedFullTimeSalary = annualSalary === null ? null : annualSalary - result.salarySacrificeAnnual;
    const adjustedAnnualEarnings = revisedFullTimeSalary === null || contracted === null || wholeTime === null
      ? null
      : (revisedFullTimeSalary / wholeTime) * contracted;

    return {
      employer: selectedEmployer?.organisation ?? null,
      annualMileage,
      vehicleId: Number(result.vehicle.vehicleId),
      vehicleName: result.vehicle.vehicleName,
      fuelType: result.vehicle.fuelType,
      listPrice: Number(result.vehicle.listPrice),
      co2Emissions: result.vehicle.co2Emissions,
      electricRange: result.vehicle.electricRange,
      bikRate: result.bikRate,
      bikSource: result.bikSource,
      annualRental,
      insurance,
      adminFees,
      vat,
      salarySacrificeAnnual: result.salarySacrificeAnnual,
      salarySacrificeMonthly: result.salarySacrificeMonthly,
      taxableBenefit,
      savingsOnPaye: result.taxSavingAnnual,
      savingsOnNi: result.niSavingAnnual,
      savingsOnPension: result.pensionSavingAnnual,
      companyCarTax: result.companyCarTaxAnnual,
      costToDriverAnnual: result.netAnnual,
      costToDriverMonthly: result.netMonthly,
      ni1aCost,
      employerNiSavings,
      employerPensionSavings,
      totalEmployerSavings,
      nmwSkipped: result.nmwSkipped,
      nmwBlocked: result.nmwBlocked,
      nmwHourlyRate: result.nmwHourlyRate,
      nmwMinimumRate: result.nmwMinimumRate,
      nmwSalaryUsed: annualSalary,
      nmwRevisedFullTimeSalary: revisedFullTimeSalary,
      nmwWholeTimeHours: wholeTime,
      nmwContractedHours: contracted,
      nmwAdjustedAnnualEarnings: adjustedAnnualEarnings,
      nmwResult: String(nmw.rows.find(([label]) => label === "Result")?.[1] ?? (result.nmwSkipped ? "Skipped" : ""))
    };
  }

  function benefitRateForVehicle(vehicle: Vehicle) {
    if (isElectricHybrid(vehicle)) {
      const range = Number(vehicle.electricRange ?? 0);
      const electricRate = electricMileageRates.find((rate) =>
        range >= Number(rate.electricMileageFrom) && range <= Number(rate.electricMileageTo)
      );
      return {
        rate: normaliseRate(electricRate?.benefitInKindPercentage ?? 0),
        source: `Electric range ${range.toLocaleString("en-GB")} miles`
      };
    }

    const co2 = Number(vehicle.co2Emissions ?? 0);
    const co2Rate = co2Rates.find((rate) =>
      co2 >= Number(rate.co2From) && co2 <= Number(rate.co2To)
    );
    return {
      rate: normaliseRate(co2Rate?.benefitInKindPercentage ?? 0),
      source: `CO2 ${co2.toLocaleString("en-GB")}g/km`
    };
  }

  async function calculateQuotes() {
    const vehicleChoices = vehicles.filter((vehicle): vehicle is Vehicle => vehicle !== null);
    if (vehicleChoices.length === 0) {
      setStatus({ type: "error", message: "Please select at least one vehicle." });
      return;
    }
    if (!selectedEmployer || !selectedTaxRate || !selectedNI) {
      setStatus({ type: "error", message: "Some calculator reference data is missing." });
      return;
    }

    setStatus({ type: "loading" });
    try {
      const rentalResponses = await Promise.all(vehicleChoices.map((vehicle) =>
        fetch(`${API_BASE_URL}/vehicle-rentals?vehicleId=${vehicle.vehicleId}&annualMileage=${annualMileage}`, {
          headers: { "x-quote-api-key": quoteApiKey }
        })
      ));
      if (rentalResponses.some((response) => !response.ok)) throw new Error("The lease rental data is temporarily unavailable.");
      const rentalBodies = await Promise.all(rentalResponses.map((response) => response.json()));
      const taxRate = normaliseRate(selectedTaxRate.taxRate);
      const niRate = taxRate >= 0.4
        ? normaliseRate(selectedNI.employeeRateUpper)
        : normaliseRate(selectedNI.employeeRateLower);
      const pensionContributionRate = paysPension === "yes" && selectedPensionRate
        ? normaliseRate(selectedPensionRate.contributionPercentage)
        : 0;
      const vatRate = normaliseRate(selectedNI.vatRate);

      const nextResults = vehicleChoices.map((vehicle, index) => {
        const rentals = rentalBodies[index].items as VehicleRentalRate[];
        const cheapestRental = rentals
          .slice()
          .sort((left, right) => Number(left.annualRental) - Number(right.annualRental))[0];
        if (!cheapestRental) {
          throw new Error(`No ${annualMileage.toLocaleString("en-GB")} mile rental was found for ${vehicle.vehicleName}.`);
        }
        const annualRental = Number(cheapestRental.annualRental);
        const salarySacrificeAnnual = (annualRental + Number(selectedEmployer.adminFee) + Number(selectedEmployer.insuranceFee)) * (1 + vatRate);
        const salarySacrificeMonthly = salarySacrificeAnnual / 12;
        const niSavingAnnual = salarySacrificeAnnual * niRate;
        const pensionSavingAnnual = salarySacrificeAnnual * pensionContributionRate;
        const taxableSalarySacrifice = Math.max(0, salarySacrificeAnnual - pensionSavingAnnual);
        const taxSavingAnnual = taxableSalarySacrifice * taxRate;
        const benefit = benefitRateForVehicle(vehicle);
        const companyCarTaxAnnual = Number(vehicle.listPrice) * benefit.rate * taxRate;
        const netAnnual = salarySacrificeAnnual - taxSavingAnnual - niSavingAnnual - pensionSavingAnnual + companyCarTaxAnnual;
        const nmw = calculateNMWHourlyRate(salarySacrificeAnnual);
        return {
          vehicle,
          annualRental,
          salarySacrificeAnnual,
          salarySacrificeMonthly,
          taxSavingAnnual,
          niSavingAnnual,
          pensionSavingAnnual,
          companyCarTaxAnnual,
          netAnnual,
          netMonthly: netAnnual / 12,
          bikRate: benefit.rate,
          bikSource: benefit.source,
          nmwSkipped: nmw.skipped,
          nmwBlocked: nmw.blocked,
          nmwHourlyRate: nmw.hourlyRate,
          nmwMinimumRate: nmw.minimumRate
        };
      });

      const saveResponse = await fetch(`${API_BASE_URL}/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-quote-api-key": quoteApiKey
        },
        body: JSON.stringify({
          quotes: nextResults.map((result) => quoteStoragePayload(result))
        })
      });
      const saveBody = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveBody.error ?? "The quotes could not be stored.");
      }
      const savedQuotes = saveBody.items as Array<{ quoteReference: number; createdAt: string; vehicleId: number }>;
      const resultsWithReferences = nextResults.map((result) => {
        const savedQuote = savedQuotes.find((quote) => String(quote.vehicleId) === String(result.vehicle.vehicleId));
        return {
          ...result,
          quoteReference: savedQuote?.quoteReference,
          quoteCreatedAt: savedQuote?.createdAt
        };
      });

      setResults(resultsWithReferences);
      setStatus({ type: "idle" });
      setStep(4);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "The quote could not be calculated."
      });
    }
  }

  function nextFromDetails(event: FormEvent) {
    event.preventDefault();
    const error = validateDetails();
    if (error) {
      setStatus({ type: "error", message: error });
      return;
    }
    setStatus({ type: "idle" });
    setStep(2);
  }

  function nextFromNMW(event: FormEvent) {
    event.preventDefault();
    const error = validateNMW();
    if (error) {
      setStatus({ type: "error", message: error });
      return;
    }
    setStatus({ type: "idle" });
    setStep(3);
  }

  if (status.type === "loading" && step === 1 && employers.length === 0) {
    return <section className="service-panel"><p className="loading-note">Loading the calculator…</p></section>;
  }

  return (
    <section className="service-panel">
      <div className="progress-steps" aria-label="Quote progress">
        {([
          [1, "1. Your details"],
          [2, "2. Minimum wage check"],
          [3, "3. Choose vehicles"],
          [4, "4. Your quote"]
        ] as const).map(([targetStep, label]) => (
          targetStep < step ? (
            <button
              key={targetStep}
              type="button"
              className="completed"
              onClick={() => {
                setStatus({ type: "idle" });
                setStep(targetStep);
              }}
            >
              {label}
            </button>
          ) : (
            <span key={targetStep} className={targetStep === step ? "current" : ""}>
              {label}
            </span>
          )
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={nextFromDetails}>
          <h2>Your details</h2>
          <p className="form-hint">These answers are used only to calculate the estimated net monthly cost.</p>

          <div className="question-block">
            <label htmlFor="employer">Employer</label>
            <p className="field-hint">Which organisation do you work for?</p>
            <select id="employer" value={employerId} onChange={(event) => setEmployerId(event.target.value)} required>
              {employers.map((employer) => (
                <option key={employer.employerId} value={employer.employerId}>{employer.organisation}</option>
              ))}
            </select>
          </div>

          <div className="question-block">
            <label htmlFor="income-tax">What level of income tax do you pay?</label>
            <p className="field-hint">
              Not sure?{" "}
              <a href="#tax-estimator" target="_blank" rel="noopener noreferrer">
                Estimate your tax rate using your payslip
              </a>.
            </p>
            <select id="income-tax" value={taxBand} onChange={(event) => setTaxBand(event.target.value)} required>
              {incomeTaxRates.map((rate) => (
                <option key={rate.taxBand} value={rate.taxBand}>{incomeTaxLabel(rate)}</option>
              ))}
            </select>
          </div>

          <fieldset className="question-block">
            <legend>Do you pay into the pension scheme?</legend>
            <label className="radio-row">
              <input type="radio" name="pension" value="yes" checked={paysPension === "yes"} onChange={() => setPaysPension("yes")} />
              Yes
            </label>
            <label className="radio-row">
              <input type="radio" name="pension" value="no" checked={paysPension === "no"} onChange={() => setPaysPension("no")} />
              No
            </label>
          </fieldset>

          {paysPension === "yes" && (
            <div className="question-block">
              <label htmlFor="pension-tier">Level of pensionable pay per year</label>
              <p className="field-hint">Select your pension contribution percentage. See your payslip for details.</p>
              <select id="pension-tier" value={pensionTier} onChange={(event) => setPensionTier(event.target.value)} required>
                {pensionRates.map((rate) => (
                  <option key={rate.tier} value={rate.tier}>{pensionLabel(rate)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="question-block">
            <label htmlFor="mileage">Please enter your annual mileage</label>
            <select
              id="mileage"
              value={annualMileage}
              onChange={(event) => setAnnualMileage(Number(event.target.value))}
              required
            >
              {mileageOptions.map((mileage) => (
                <option key={mileage} value={mileage}>{mileage.toLocaleString("en-GB")} miles</option>
              ))}
            </select>
          </div>

          {status.type === "error" && <div className="message error">{status.message}</div>}
          <button className="service-button" type="submit">Continue</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={nextFromNMW}>
          <h2>National Minimum Wage check</h2>
          <p className="form-hint">
            This optional step checks whether a vehicle would take your estimated hourly pay below the National Minimum Wage.
          </p>

          <fieldset className="question-block">
            <legend>Do you want to complete this check now?</legend>
            <label className="radio-row">
              <input type="radio" name="skip-nmw" checked={!skipNMW} onChange={() => setSkipNMW(false)} />
              Yes, complete the check
            </label>
            <label className="radio-row">
              <input type="radio" name="skip-nmw" checked={skipNMW} onChange={() => setSkipNMW(true)} />
              No, skip this step
            </label>
          </fieldset>

          {!skipNMW && (
            <>
              <div className="question-block">
                <label htmlFor="age-band">Age range</label>
                <p className="field-hint">Select your age band.</p>
                <select id="age-band" value={ageBand} onChange={(event) => setAgeBand(event.target.value)} required>
                  {nationalMinimumWageRates.map((rate) => (
                    <option key={rate.nmwRateId} value={rate.ageBand}>
                      {rate.ageBand} — minimum {currency(rate.hourlyRate)} per hour
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className="question-block">
                <legend>Are you employed on Agenda for Change terms and conditions?</legend>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="agenda-for-change"
                    value="yes"
                    checked={isAgendaForChange === "yes"}
                    onChange={() => {
                      setIsAgendaForChange("yes");
                      setWholeTimeHours("37.5");
                    }}
                  />
                  Yes
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="agenda-for-change"
                    value="no"
                    checked={isAgendaForChange === "no"}
                    onChange={() => setIsAgendaForChange("no")}
                  />
                  No
                </label>
              </fieldset>

              {isAgendaForChange === "yes" ? (
                <div className="question-block">
                  <label htmlFor="afc-pay">Agenda for Change band and annual salary</label>
                  <p className="field-hint">Select your band and full-time equivalent salary.</p>
                  <select id="afc-pay" value={afcPayRateId} onChange={(event) => setAFCPayRateId(event.target.value)} required>
                    {agendaForChangePayRates.map((rate) => (
                      <option key={rate.afcPayRateId} value={rate.afcPayRateId}>{afcLabel(rate)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="question-block">
                  <label htmlFor="full-time-salary">What is your full-time equivalent salary?</label>
                  <input
                    id="full-time-salary"
                    type="number"
                    min="1"
                    step="0.01"
                    value={fullTimeAnnualSalary}
                    onChange={(event) => setFullTimeAnnualSalary(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className="question-block">
                <label htmlFor="contracted-hours">What are your weekly contracted hours/sessions?</label>
                <input
                  id="contracted-hours"
                  type="number"
                  min="1"
                  max="80"
                  step="0.01"
                  value={contractedHours}
                  onChange={(event) => setContractedHours(event.target.value)}
                />
              </div>

              <div className="question-block">
                <label htmlFor="whole-time-hours">What are your full-time equivalent weekly hours/sessions?</label>
                <input
                  id="whole-time-hours"
                  type="number"
                  min="1"
                  max="80"
                  step="0.01"
                  value={wholeTimeHours}
                  onChange={(event) => setWholeTimeHours(event.target.value)}
                  disabled={isAgendaForChange === "yes"}
                />
                {isAgendaForChange === "yes" && (
                  <p className="form-hint">Agenda for Change whole-time hours are fixed at 37.5 hours per week.</p>
                )}
              </div>
            </>
          )}

          {skipNMW && (
            <div className="notice">
              Eligibility will be subject to a National Minimum Wage check before the vehicle can be approved.
            </div>
          )}

          {status.type === "error" && <div className="message error">{status.message}</div>}

          <div className="button-row">
            <button className="secondary-service-button" type="button" onClick={() => setStep(1)}>Back</button>
            <button className="service-button" type="submit">Continue</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div>
          <h2>Choose up to 5 cars</h2>
          <p className="form-hint">
            Please select up to 5 vehicles to compare the prices for. If required, filter this list by fuel type or estimated monthly cost using the first drop-down lists below.
          </p>

          <div className="filter-field">
            <label htmlFor="vehicle-type">Fuel type <span>(optional)</span></label>
            <select
              id="vehicle-type"
              value={vehicleType}
              onChange={(event) => setVehicleType(event.target.value)}
            >
              <option value="">All fuel types</option>
              {vehicleTypes.map((type) => (
                <option key={type.vehicleType} value={type.vehicleType}>
                  {type.vehicleType} ({type.vehicleCount.toLocaleString("en-GB")})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="maximum-monthly-cost">Maximum estimated monthly cost <span>(optional)</span></label>
            <select
              id="maximum-monthly-cost"
              value={maxMonthlyCost}
              onChange={(event) => setMaxMonthlyCost(event.target.value)}
            >
              <option value="">No maximum</option>
              {monthlyCostOptions.map((amount) => (
                <option key={amount} value={amount}>
                  Up to {currency(amount)} per month
                </option>
              ))}
            </select>
          </div>

          <div className="vehicle-grid">
            {vehicles.map((vehicle, index) => (
              <VehiclePicker
                key={index}
                index={index}
                value={vehicle}
                onChange={(nextVehicle) => updateVehicle(index, nextVehicle)}
                excludedIds={selectedIds.filter((id) => id !== vehicle?.vehicleId)}
                vehicleType={vehicleType}
                maxMonthlyCost={maxMonthlyCost}
                annualMileage={annualMileage}
                costFilter={vehicleCostFilter}
                quoteApiKey={quoteApiKey}
              />
            ))}
          </div>

          {status.type === "error" && <div className="message error">{status.message}</div>}

          <div className="button-row">
            <button className="secondary-service-button" type="button" onClick={() => setStep(2)}>Back</button>
            <button className="service-button" type="button" disabled={status.type === "loading"} onClick={() => void calculateQuotes()}>
              {status.type === "loading" ? "Calculating…" : "Calculate quote"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2>Your estimated salary sacrifice quotes</h2>
          <p className="form-hint">
            These estimates use the cheapest available rental for each selected vehicle at {annualMileage.toLocaleString("en-GB")} miles per year.
          </p>
          <button className="service-button no-print" type="button" onClick={() => window.print()}>
            Save as PDF / Print
          </button>

          <div className="result-list">
            {results.map((result) => (
              <article className="quote-result" key={result.vehicle.vehicleId}>
                <div>
                  <h3>
                    <button
                      type="button"
                      className="vehicle-title-button"
                      onClick={() => {
                        setSelectedBreakdownResult(result);
                        setStatus({ type: "idle" });
                        setStep(6);
                      }}
                    >
                      {result.vehicle.vehicleName}
                    </button>
                  </h3>
                  {result.quoteReference && (
                    <p className="quote-reference">Quote reference: {result.quoteReference}</p>
                  )}
                  <p>{result.vehicle.fuelType} · List price {currency(result.vehicle.listPrice)} · BIK {percent(result.bikRate)} ({result.bikSource})</p>
                </div>
                {result.nmwBlocked ? (
                  <div className="message error">
                    This car would take the estimated hourly rate to {currency(result.nmwHourlyRate ?? 0)}, which is below the National Minimum Wage rate of {currency(result.nmwMinimumRate ?? 0)} for the selected age range.
                  </div>
                ) : (
                  <>
                    <div className="result-price">
                      <div>
                        <span>Monthly salary sacrifice</span>
                        <strong>{currency(result.salarySacrificeMonthly)}</strong>
                        <small>per month</small>
                      </div>
                      <div>
                        <span>Estimated monthly cost</span>
                        <strong>{currency(result.netMonthly)}</strong>
                        <small>per month</small>
                      </div>
                    </div>
                    {result.nmwSkipped && (
                      <div className="notice">
                        Eligibility subject to National Minimum Wage check.
                      </div>
                    )}
                    <button
                      className="service-button no-print"
                      type="button"
                      onClick={() => {
                        setSelectedOrderResult(result);
                        setStatus({ type: "idle" });
                        setStep(5);
                      }}
                    >
                      Select Vehicle
                    </button>
                  </>
                )}
              </article>
            ))}
          </div>

          <div className="button-row">
            <button className="secondary-service-button" type="button" onClick={() => setStep(3)}>Back to vehicles</button>
            <button className="service-button no-print" type="button" onClick={() => window.print()}>Save as PDF / Print</button>
            <button className="service-button" type="button" onClick={() => setStep(1)}>Start again</button>
          </div>
        </div>
      )}

      {step === 5 && selectedOrderResult && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendFleetEmail();
          }}
        >
          <h2>Email Fleet Management</h2>
          <p className="form-hint">
            If you are interested in leasing this vehicle, please email this quote to Fleet Management.
            They will send you a revised quote and include any of the following optional extras.
          </p>
          <PrivacyNotice />

          <div className="question-block">
            <label htmlFor="order-full-name">Full name</label>
            <input
              id="order-full-name"
              value={orderForm.fullName}
              onChange={(event) => updateOrderForm("fullName", event.target.value)}
              required
            />
          </div>

          <div className="question-block">
            <label htmlFor="order-email-address">Email address</label>
            <input
              id="order-email-address"
              type="email"
              value={orderForm.emailAddress}
              onChange={(event) => updateOrderForm("emailAddress", event.target.value)}
              required
            />
          </div>

          <article className="quote-result order-quote-summary">
            <div>
              <h3>{selectedOrderResult.vehicle.vehicleName}</h3>
              {selectedOrderResult.quoteReference && (
                <p className="quote-reference">Quote reference: {selectedOrderResult.quoteReference}</p>
              )}
              <p>
                {selectedOrderResult.vehicle.fuelType} · List price {currency(selectedOrderResult.vehicle.listPrice)} · BIK {percent(selectedOrderResult.bikRate)} ({selectedOrderResult.bikSource})
              </p>
            </div>
            <div className="result-price">
              <div>
                <span>Monthly salary sacrifice</span>
                <strong>{currency(selectedOrderResult.salarySacrificeMonthly)}</strong>
                <small>per month</small>
              </div>
              <div>
                <span>Estimated monthly cost</span>
                <strong>{currency(selectedOrderResult.netMonthly)}</strong>
                <small>per month</small>
              </div>
            </div>
          </article>

          <div className="question-block">
            <label htmlFor="body-colour">Body Colour</label>
            <input
              id="body-colour"
              value={orderForm.bodyColour}
              onChange={(event) => updateOrderForm("bodyColour", event.target.value)}
              required
            />
          </div>

          <div className="question-block">
            <label htmlFor="interior-colour">Interior Colour/Trim</label>
            <input
              id="interior-colour"
              value={orderForm.interiorColour}
              onChange={(event) => updateOrderForm("interiorColour", event.target.value)}
              required
            />
          </div>

          <div className="question-block">
            <label htmlFor="order-optional-extras">Optional Extras</label>
            <textarea
              id="order-optional-extras"
              value={orderForm.optionalExtras}
              onChange={(event) => updateOrderForm("optionalExtras", event.target.value)}
              placeholder="Enter any optional extras you would like Fleet Management to include."
            />
          </div>

          <div className="question-block">
            <label htmlFor="earliest-delivery-date">Earliest delivery date</label>
            <p className="form-hint">Please add a date or state delivery ASAP.</p>
            <input
              id="earliest-delivery-date"
              value={orderForm.earliestDeliveryDate}
              onChange={(event) => updateOrderForm("earliestDeliveryDate", event.target.value)}
              required
            />
          </div>

          <div className="question-block">
            <label htmlFor="replacement-registration">State registration number of old car if replacement lease vehicle</label>
            <input
              id="replacement-registration"
              value={orderForm.replacementRegistration}
              onChange={(event) => updateOrderForm("replacementRegistration", event.target.value)}
            />
          </div>

          <div className="button-row">
            <button className="secondary-service-button" type="button" onClick={() => setStep(4)}>Back to quotes</button>
            <button className="service-button large-email-button" type="submit">Email To Fleet Management</button>
          </div>
        </form>
      )}

      {step === 6 && selectedBreakdownResult && (
        <div>
          <h2>Cost breakdown</h2>
          <article className="quote-result order-quote-summary">
            <div>
              <h3>{selectedBreakdownResult.vehicle.vehicleName}</h3>
              {selectedBreakdownResult.quoteReference && (
                <p className="quote-reference">Quote reference: {selectedBreakdownResult.quoteReference}</p>
              )}
              <p>
                {selectedBreakdownResult.vehicle.fuelType} · List price {currency(selectedBreakdownResult.vehicle.listPrice)} · BIK {percent(selectedBreakdownResult.bikRate)} ({selectedBreakdownResult.bikSource})
              </p>
            </div>
          </article>

          <div className="breakdown-table-wrap">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th scope="col">Calculation</th>
                  <th scope="col">Annual</th>
                  <th scope="col">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {quoteBreakdown(selectedBreakdownResult).main.map(([label, amount, highlighted]) => (
                  <tr key={label} className={highlighted ? "highlighted" : ""}>
                    <th scope="row">{label}</th>
                    <td>{currency(amount)}</td>
                    <td>{currency(amount / 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="breakdown-table-wrap employer-breakdown">
            <table className="breakdown-table">
              <tbody>
                {quoteBreakdown(selectedBreakdownResult).employer.map(([label, amount, highlighted]) => (
                  <tr key={label} className={highlighted ? "highlighted" : ""}>
                    <th scope="row">{label}</th>
                    <td>{currency(amount)}</td>
                    <td>{currency(amount / 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="nmw-breakdown">
            <h3>National Minimum Wage calculation</h3>
            <table className="nmw-breakdown-table">
              <tbody>
                {nmwBreakdown(selectedBreakdownResult).rows.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="button-row">
            <button className="secondary-service-button" type="button" onClick={() => setStep(4)}>Back to quotes</button>
          </div>
        </div>
      )}
    </section>
  );
}

function AdminPage() {
  const [selectedSlug, setSelectedSlug] = useState(adminTables[0].slug);
  const [apiKey, setApiKey] = useState(() => window.sessionStorage.getItem("lease-car-admin-key") ?? "");
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const selectedTable = useMemo(
    () => adminTables.find((table) => table.slug === selectedSlug) ?? adminTables[0],
    [selectedSlug]
  );

  function unlockAdmin(event: FormEvent) {
    event.preventDefault();
    const nextKey = draftApiKey.trim();
    window.sessionStorage.setItem("lease-car-admin-key", nextKey);
    setApiKey(nextKey);
  }

  if (!apiKey) {
    return (
      <section className="admin-card">
        <form className="admin-unlock" onSubmit={unlockAdmin}>
          <h2>Admin access</h2>
          <p>Enter the private admin key before viewing or changing reference tables.</p>
          <label htmlFor="admin-api-key">Admin API key</label>
          <input
            id="admin-api-key"
            type="password"
            value={draftApiKey}
            onChange={(event) => setDraftApiKey(event.target.value)}
            autoComplete="off"
          />
          <button className="submit-button" type="submit">Unlock admin pages</button>
        </form>
      </section>
    );
  }

  return (
    <section className="admin-card">
      <div className="admin-page-heading">
        <BrandHeader />
        <h1>CARculator administration</h1>
        <p>Maintain the reference values used by CARculator.</p>
      </div>
      <div className="admin-key-bar">
        <span>Admin access unlocked for this browser session.</span>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            window.sessionStorage.removeItem("lease-car-admin-key");
            setApiKey("");
            setDraftApiKey("");
          }}
        >
          Lock
        </button>
      </div>
      <div className="admin-tabs" role="tablist" aria-label="Admin tables">
        <button
          type="button"
          className={selectedSlug === "stored-quotes" ? "active" : ""}
          onClick={() => setSelectedSlug("stored-quotes")}
        >
          Stored Quotes
        </button>
        <button
          type="button"
          className={selectedSlug === "vehicles" ? "active" : ""}
          onClick={() => setSelectedSlug("vehicles")}
        >
          Vehicles
        </button>
        <button
          type="button"
          className={selectedSlug === "settings" ? "active" : ""}
          onClick={() => setSelectedSlug("settings")}
        >
          Settings
        </button>
        {adminTables.map((table) => (
          <button
            key={table.slug}
            type="button"
            className={table.slug === selectedSlug ? "active" : ""}
            onClick={() => setSelectedSlug(table.slug)}
          >
            {table.title}
          </button>
        ))}
      </div>
      {selectedSlug === "stored-quotes" ? (
        <AdminQuotes apiKey={apiKey} />
      ) : selectedSlug === "vehicles" ? (
        <AdminVehicles apiKey={apiKey} />
      ) : selectedSlug === "settings" ? (
        <AdminSettings apiKey={apiKey} />
      ) : (
        <AdminTable key={selectedTable.slug} config={selectedTable} apiKey={apiKey} />
      )}
    </section>
  );
}

function storedQuoteMainRows(quote: StoredQuoteDetail) {
  return [
    ["Annual Rental", quote.annualRental],
    ["Insurance", quote.insurance],
    ["Admin Fees", quote.adminFees],
    ["VAT", quote.vat],
    ["Salary Sacrifice", quote.salarySacrificeAnnual, true],
    ["Taxable Benefit", quote.taxableBenefit],
    ["Savings on PAYE", quote.savingsOnPaye],
    ["Savings on NI", quote.savingsOnNi],
    ["Savings on Pension", quote.savingsOnPension],
    ["Company Car Tax", quote.companyCarTax],
    ["Cost to Driver", quote.costToDriverAnnual, true]
  ] as const;
}

function storedQuoteEmployerRows(quote: StoredQuoteDetail) {
  return [
    ["NI 1A Cost", quote.ni1aCost],
    ["ERs NI Savings", quote.employerNiSavings],
    ["ERs Pension Savings", quote.employerPensionSavings],
    ["Total Employer Savings", quote.totalEmployerSavings, true]
  ] as const;
}

function storedQuoteNMWRows(quote: StoredQuoteDetail) {
  if (quote.nmwSkipped) return [["Status", "Eligibility subject to National Minimum Wage check"]] as const;
  return [
    ["Salary used", quote.nmwSalaryUsed === null ? "Not stored" : currency(quote.nmwSalaryUsed)],
    ["Less annual salary sacrifice", currency(quote.salarySacrificeAnnual)],
    ["Revised full-time equivalent salary", quote.nmwRevisedFullTimeSalary === null ? "Not stored" : currency(quote.nmwRevisedFullTimeSalary)],
    ["Full-time equivalent weekly hours/sessions", quote.nmwWholeTimeHours === null ? "Not stored" : quote.nmwWholeTimeHours.toLocaleString("en-GB")],
    ["Weekly contracted hours/sessions", quote.nmwContractedHours === null ? "Not stored" : quote.nmwContractedHours.toLocaleString("en-GB")],
    ["Adjusted annual earnings for contracted hours", quote.nmwAdjustedAnnualEarnings === null ? "Not stored" : currency(quote.nmwAdjustedAnnualEarnings)],
    ["Calculated hourly rate", quote.nmwHourlyRate === null ? "Not stored" : currency(quote.nmwHourlyRate)],
    ["National Minimum Wage rate", quote.nmwMinimumRate === null ? "Not stored" : currency(quote.nmwMinimumRate)],
    ["Result", quote.nmwResult ?? "Not stored"]
  ] as const;
}

function storedQuoteAccessRows(quote: StoredQuoteDetail) {
  return [
    ["IP address", quote.clientIpAddress ?? "Not stored"],
    ["Device", quote.deviceType ?? "Not stored"],
    ["Browser", quote.browserName ?? "Not stored"],
    ["Browser details", quote.userAgent ?? "Not stored"]
  ] as const;
}

function storedQuoteVehicleRows(quote: StoredQuoteDetail) {
  return [
    ["Vehicle ID", quote.vehicleId.toString()],
    ["Vehicle name", quote.vehicleName],
    ["Fuel type", quote.fuelType ?? "Not stored"],
    ["List price", currency(quote.listPrice)],
    ["CO2 rate", quote.co2Emissions === null ? "Not stored" : `${quote.co2Emissions.toLocaleString("en-GB")}g/km`],
    ["Electric range", quote.electricRange === null ? "Not stored" : `${quote.electricRange.toLocaleString("en-GB")} miles`],
    ["BIK percentage", `${percent(quote.bikRate)}${quote.bikSource ? ` (${quote.bikSource})` : ""}`]
  ] as const;
}

function AdminVehicles({ apiKey }: { apiKey: string }) {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [offerFilter, setOfferFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<AdminVehicle | null>(null);
  const [rentals, setRentals] = useState<VehicleRentalRate[]>([]);
  const [status, setStatus] = useState<{ type: "loading" | "idle" | "success" | "error"; message?: string }>({ type: "loading" });
  const pageSize = 50;

  async function loadVehicles(search = activeSearch, nextPage = page) {
    setStatus({ type: "loading" });
    try {
      const params = new URLSearchParams({ limit: String(pageSize), page: String(nextPage) });
      if (search.trim()) params.set("search", search.trim());
      if (offerFilter) params.set("isOnOffer", offerFilter);
      const response = await fetch(`${API_BASE_URL}/admin/vehicles?${params}`, {
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load vehicles");
      setVehicles(body.items);
      setTotal(body.total);
      setPage(nextPage);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not load vehicles" });
    }
  }

  async function updateVehicleOffer(vehicle: AdminVehicle, isOnOffer: boolean) {
    const previousVehicles = vehicles;
    setVehicles((current) => current.map((item) => (
      item.vehicleId === vehicle.vehicleId ? { ...item, isOnOffer } : item
    )));
    try {
      const response = await fetch(`${API_BASE_URL}/admin/vehicles/${vehicle.vehicleId}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-admin-api-key": apiKey
        },
        body: JSON.stringify({ isOnOffer })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not update offer flag");
      setStatus({ type: "success", message: `${vehicle.vehicleName} ${isOnOffer ? "flagged as on offer" : "removed from offers"}.` });
      if (offerFilter && offerFilter !== String(isOnOffer)) {
        await loadVehicles(activeSearch, page);
      }
    } catch (error) {
      setVehicles(previousVehicles);
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not update offer flag" });
    }
  }

  async function viewRentals(vehicle: AdminVehicle) {
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/vehicles/${vehicle.vehicleId}/rentals`, {
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load vehicle rentals");
      setSelectedVehicle(vehicle);
      setRentals(body.items);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not load vehicle rentals" });
    }
  }

  async function deleteVehicle(vehicle: AdminVehicle) {
    const confirmed = window.confirm(
      `Delete ${vehicle.vehicleName}? This will also delete ${vehicle.rentalCount} annual rental record${vehicle.rentalCount === 1 ? "" : "s"} for this vehicle.`
    );
    if (!confirmed) return;
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/vehicles/${vehicle.vehicleId}`, {
        method: "DELETE",
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not delete vehicle");
      if (selectedVehicle?.vehicleId === vehicle.vehicleId) {
        setSelectedVehicle(null);
        setRentals([]);
      }
      await loadVehicles(activeSearch, page);
      setStatus({ type: "success", message: `Vehicle deleted. ${body.deletedRentals ?? 0} rental records were also removed.` });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not delete vehicle" });
    }
  }

  useEffect(() => {
    void loadVehicles("", 1);
  }, [apiKey]);

  if (selectedVehicle) {
    return (
      <div>
        <div className="admin-header">
          <div>
            <h2>Annual rentals</h2>
            <p>{selectedVehicle.vehicleName}</p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setSelectedVehicle(null);
              setRentals([]);
            }}
          >
            Back to vehicles
          </button>
        </div>

        {status.type === "error" && <div className="message error">{status.message}</div>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Annual mileage</th>
                <th>Provider</th>
                <th>Annual rental</th>
                <th>Effective at</th>
                <th>External quote ref</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => (
                <tr key={rental.vehicleRentalRateId}>
                  <td>{rental.annualMileage.toLocaleString("en-GB")}</td>
                  <td>{rental.providerCode}</td>
                  <td>{currency(Number(rental.annualRental))}</td>
                  <td>{rental.effectiveAt ? new Date(rental.effectiveAt).toLocaleString("en-GB") : "—"}</td>
                  <td>{rental.externalQuoteReference ?? "—"}</td>
                </tr>
              ))}
              {rentals.length === 0 && status.type !== "loading" && (
                <tr><td colSpan={5}>No annual rentals found for this vehicle.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {status.type === "loading" && <p className="loading-note">Loading…</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <h2>Vehicles</h2>
          <p>Search the vehicle table, view annual rentals, or delete vehicles from CARculator.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadVehicles(activeSearch, page)}>
          Refresh
        </button>
      </div>

      <form
        className="admin-search"
        onSubmit={(event) => {
          event.preventDefault();
          const nextSearch = searchText.trim();
          setActiveSearch(nextSearch);
          void loadVehicles(nextSearch, 1);
        }}
      >
        <label htmlFor="admin-vehicle-search">Search/filter vehicle</label>
        <div>
          <input
            id="admin-vehicle-search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Enter vehicle name"
          />
          <button className="small-button" type="submit">Search</button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSearchText("");
              setActiveSearch("");
              void loadVehicles("", 1);
            }}
          >
            Clear
          </button>
        </div>
      </form>

      <div className="admin-search">
        <label htmlFor="admin-offer-filter">Filter by offer status</label>
        <div>
          <select
            id="admin-offer-filter"
            value={offerFilter}
            onChange={(event) => {
              const nextOfferFilter = event.target.value;
              setOfferFilter(nextOfferFilter);
              setPage(1);
              setStatus({ type: "loading" });
              const params = new URLSearchParams({ limit: String(pageSize), page: "1" });
              if (activeSearch.trim()) params.set("search", activeSearch.trim());
              if (nextOfferFilter) params.set("isOnOffer", nextOfferFilter);
              fetch(`${API_BASE_URL}/admin/vehicles?${params}`, {
                headers: { "x-admin-api-key": apiKey }
              })
                .then(async (response) => {
                  const body = await response.json();
                  if (!response.ok) throw new Error(body.error ?? "Could not load vehicles");
                  setVehicles(body.items);
                  setTotal(body.total);
                  setStatus({ type: "idle" });
                })
                .catch((error) => {
                  setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not load vehicles" });
                });
            }}
          >
            <option value="">All vehicles</option>
            <option value="true">On offer only</option>
            <option value="false">Not on offer only</option>
          </select>
        </div>
      </div>

      {status.type === "error" && <div className="message error">{status.message}</div>}
      {status.type === "success" && <div className="message success">{status.message}</div>}

      <div className="admin-pagination">
        <p>
          Showing {total === 0 ? 0 : ((page - 1) * pageSize + 1).toLocaleString("en-GB")}
          {" "}to {Math.min(page * pageSize, total).toLocaleString("en-GB")}
          {" "}of {total.toLocaleString("en-GB")} vehicles{activeSearch ? ` matching “${activeSearch}”` : ""}{offerFilter ? ` (${offerFilter === "true" ? "on offer" : "not on offer"})` : ""}.
        </p>
        <div>
          <button
            type="button"
            className="secondary-button"
            disabled={page <= 1 || status.type === "loading"}
            onClick={() => void loadVehicles(activeSearch, page - 1)}
          >
            Previous 50
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={page * pageSize >= total || status.type === "loading"}
            onClick={() => void loadVehicles(activeSearch, page + 1)}
          >
            Next 50
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table admin-vehicles-table">
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Vehicle</th>
              <th>Fuel type</th>
              <th>List price</th>
              <th>CO2</th>
              <th>Range</th>
              <th>On offer</th>
              <th>Rental records</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.vehicleId}>
                <td>{vehicle.vehicleId}</td>
                <td>{vehicle.vehicleName}</td>
                <td>{vehicle.fuelType}</td>
                <td>{currency(Number(vehicle.listPrice))}</td>
                <td>{vehicle.co2Emissions ?? "—"}</td>
                <td>{vehicle.electricRange ?? "—"}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={Boolean(vehicle.isOnOffer)}
                    aria-label={`Mark ${vehicle.vehicleName} as on offer`}
                    onChange={(event) => void updateVehicleOffer(vehicle, event.target.checked)}
                  />
                </td>
                <td>{vehicle.rentalCount}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="small-button" onClick={() => void viewRentals(vehicle)}>View rentals</button>
                    <button type="button" className="text-button" onClick={() => void deleteVehicle(vehicle)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && status.type !== "loading" && (
              <tr><td colSpan={9}>No matching vehicles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {status.type === "loading" && <p className="loading-note">Loading…</p>}
    </div>
  );
}

function AdminSettings({ apiKey }: { apiKey: string }) {
  const [quoteAppPasskey, setQuoteAppPasskey] = useState("");
  const [status, setStatus] = useState<{ type: "loading" | "idle" | "success" | "error"; message?: string }>({ type: "loading" });

  async function loadSettings() {
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load settings");
      setQuoteAppPasskey(body.quoteAppPasskey ?? "");
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not load settings" });
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-api-key": apiKey },
        body: JSON.stringify({ quoteAppPasskey })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save settings");
      window.sessionStorage.removeItem("lease-car-quote-key");
      setStatus({ type: "success", message: "Quote app passkey updated. Anyone already in CARculator may need to re-enter the new passkey on their next session." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not save settings" });
    }
  }

  useEffect(() => {
    void loadSettings();
  }, [apiKey]);

  return (
    <div>
      <div className="admin-header">
        <div>
          <h2>Settings</h2>
          <p>Change application settings used by CARculator.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadSettings()}>
          Refresh
        </button>
      </div>

      {status.type === "error" && <div className="message error">{status.message}</div>}
      {status.type === "success" && <div className="message success">{status.message}</div>}

      <form className="admin-settings-form" onSubmit={saveSettings}>
        <div className="question-block">
          <label htmlFor="quote-app-passkey">Quote app passkey</label>
          <input
            id="quote-app-passkey"
            value={quoteAppPasskey}
            onChange={(event) => setQuoteAppPasskey(event.target.value)}
            minLength={4}
            maxLength={100}
            required
          />
          <p className="form-hint">This is the passkey users enter on the first CARculator screen.</p>
        </div>
        <button className="service-button" type="submit" disabled={status.type === "loading"}>
          Save quote app passkey
        </button>
      </form>
      {status.type === "loading" && <p className="loading-note">Loading…</p>}
    </div>
  );
}

function AdminQuotes({ apiKey }: { apiKey: string }) {
  const [quotes, setQuotes] = useState<StoredQuoteSummary[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<StoredQuoteDetail | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<{ type: "loading" | "idle" | "success" | "error"; message?: string }>({ type: "loading" });
  const pageSize = 50;

  async function loadQuotes(search = activeSearch, nextPage = page) {
    setStatus({ type: "loading" });
    try {
      const params = new URLSearchParams({ limit: String(pageSize), page: String(nextPage) });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`${API_BASE_URL}/admin/quotes?${params}`, {
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load stored quotes");
      setQuotes(body.items);
      setTotal(body.total);
      setPage(nextPage);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not load stored quotes" });
    }
  }

  async function viewQuote(quoteReference: number) {
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/quotes/${quoteReference}`, {
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load quote details");
      setSelectedQuote(body.item);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not load quote details" });
    }
  }

  async function deleteQuote(quoteReference: number) {
    if (!window.confirm(`Delete quote reference ${quoteReference}?`)) return;
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/quotes/${quoteReference}`, {
        method: "DELETE",
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not delete quote");
      setSelectedQuote(null);
      await loadQuotes(activeSearch, page);
      setStatus({ type: "success", message: "Quote deleted." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not delete quote" });
    }
  }

  useEffect(() => {
    void loadQuotes("", 1);
  }, [apiKey]);

  if (selectedQuote) {
    return (
      <div>
        <div className="admin-header">
          <div>
            <h2>Quote reference {selectedQuote.quoteReference}</h2>
            <p>{selectedQuote.vehicleName} · {selectedQuote.employer ?? "No employer stored"} · {new Date(selectedQuote.createdAt).toLocaleString("en-GB")}</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => setSelectedQuote(null)}>Back to quote list</button>
        </div>

        <div className="nmw-breakdown">
          <h3>Vehicle details</h3>
          <table className="nmw-breakdown-table">
            <tbody>
              {storedQuoteVehicleRows(selectedQuote).map(([label, value]) => (
                <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="breakdown-table-wrap">
          <table className="breakdown-table">
            <thead>
              <tr><th>Calculation</th><th>Annual</th><th>Monthly</th></tr>
            </thead>
            <tbody>
              {storedQuoteMainRows(selectedQuote).map(([label, amount, highlighted]) => (
                <tr key={label} className={highlighted ? "highlighted" : ""}>
                  <th scope="row">{label}</th>
                  <td>{currency(amount)}</td>
                  <td>{currency(amount / 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="breakdown-table-wrap employer-breakdown">
          <table className="breakdown-table">
            <tbody>
              {storedQuoteEmployerRows(selectedQuote).map(([label, amount, highlighted]) => (
                <tr key={label} className={highlighted ? "highlighted" : ""}>
                  <th scope="row">{label}</th>
                  <td>{currency(amount)}</td>
                  <td>{currency(amount / 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="nmw-breakdown">
          <h3>National Minimum Wage calculation</h3>
          <table className="nmw-breakdown-table">
            <tbody>
              {storedQuoteNMWRows(selectedQuote).map(([label, value]) => (
                <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="nmw-breakdown">
          <h3>Access details</h3>
          <table className="nmw-breakdown-table">
            <tbody>
              {storedQuoteAccessRows(selectedQuote).map(([label, value]) => (
                <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <h2>Stored Quotes</h2>
          <p>Quotes calculated in CARculator. Employee names and email addresses are not stored.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadQuotes(activeSearch, page)}>Refresh</button>
      </div>

      <form
        className="admin-search"
        onSubmit={(event) => {
          event.preventDefault();
          const nextSearch = searchText.trim();
          setActiveSearch(nextSearch);
          void loadQuotes(nextSearch, 1);
        }}
      >
        <label htmlFor="admin-quote-search">Search/filter stored quotes</label>
        <div>
          <input
            id="admin-quote-search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Enter quote number or vehicle name"
          />
          <button className="small-button" type="submit">Search</button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSearchText("");
              setActiveSearch("");
              void loadQuotes("", 1);
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {status.type === "error" && <div className="message error">{status.message}</div>}
      {status.type === "success" && <div className="message success">{status.message}</div>}

      <div className="admin-pagination">
        <p>
          Showing {total === 0 ? 0 : ((page - 1) * pageSize + 1).toLocaleString("en-GB")}
          {" "}to {Math.min(page * pageSize, total).toLocaleString("en-GB")}
          {" "}of {total.toLocaleString("en-GB")} quotes{activeSearch ? ` matching “${activeSearch}”` : ""}.
        </p>
        <div>
          <button
            type="button"
            className="secondary-button"
            disabled={page <= 1 || status.type === "loading"}
            onClick={() => void loadQuotes(activeSearch, page - 1)}
          >
            Previous 50
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={page * pageSize >= total || status.type === "loading"}
            onClick={() => void loadQuotes(activeSearch, page + 1)}
          >
            Next 50
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Quote ref</th>
              <th>Created</th>
              <th>Employer</th>
              <th>Vehicle</th>
              <th>Device</th>
              <th>Browser</th>
              <th>IP address</th>
              <th>Monthly sacrifice</th>
              <th>Monthly cost</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.quoteReference}>
                <td>{quote.quoteReference}</td>
                <td>{new Date(quote.createdAt).toLocaleString("en-GB")}</td>
                <td>{quote.employer ?? "—"}</td>
                <td>{quote.vehicleName}</td>
                <td>{quote.deviceType ?? "—"}</td>
                <td>{quote.browserName ?? "—"}</td>
                <td>{quote.clientIpAddress ?? "—"}</td>
                <td>{currency(quote.salarySacrificeMonthly)}</td>
                <td>{currency(quote.costToDriverMonthly)}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="small-button" onClick={() => void viewQuote(quote.quoteReference)}>View details</button>
                    <button type="button" className="text-button" onClick={() => void deleteQuote(quote.quoteReference)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && status.type !== "loading" && (
              <tr><td colSpan={10}>No stored quotes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {status.type === "loading" && <p className="loading-note">Loading…</p>}
    </div>
  );
}

function AdminTable({ config, apiKey }: { config: AdminTableConfig; apiKey: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [newRow, setNewRow] = useState<Record<string, string | number | null>>(config.emptyRow);
  const [status, setStatus] = useState<{ type: "loading" | "idle" | "success" | "error"; message?: string }>({ type: "loading" });

  async function loadRows() {
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${config.slug}`, {
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load table");
      setRows(body.items);
      setDrafts(Object.fromEntries(body.items.map((row: Record<string, unknown>) => [String(row[config.idKey]), { ...row }])));
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not load table" });
    }
  }

  useEffect(() => {
    setNewRow(config.emptyRow);
    void loadRows();
  }, [config.slug, apiKey]);

  function updateDraft(id: string, field: AdminField, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field.key]: field.type === "number" && value !== "" ? Number(value) : value
      }
    }));
  }

  function updateNewRow(field: AdminField, value: string) {
    setNewRow((current) => ({
      ...current,
      [field.key]: field.type === "number" && value !== "" ? Number(value) : value
    }));
  }

  async function saveRow(id: string) {
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${config.slug}/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-api-key": apiKey },
        body: JSON.stringify(drafts[id])
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save row");
      await loadRows();
      setStatus({ type: "success", message: "Saved." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not save row" });
    }
  }

  async function addRow() {
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${config.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-api-key": apiKey },
        body: JSON.stringify(newRow)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not add row");
      setNewRow(config.emptyRow);
      await loadRows();
      setStatus({ type: "success", message: "Added." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not add row" });
    }
  }

  async function deleteRow(id: string) {
    if (!window.confirm("Delete this row?")) return;
    setStatus({ type: "loading" });
    try {
      const response = await fetch(`${API_BASE_URL}/admin/${config.slug}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-api-key": apiKey }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not delete row");
      await loadRows();
      setStatus({ type: "success", message: "Deleted." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Could not delete row" });
    }
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadRows()}>
          Refresh
        </button>
      </div>

      {status.type === "error" && <div className="message error">{status.message}</div>}
      {status.type === "success" && <div className="message success">{status.message}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {config.fields.map((field) => <th key={field.key}>{field.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = String(row[config.idKey]);
              const draft = drafts[id] ?? row;
              return (
                <tr key={id}>
                  {config.fields.map((field) => (
                    <td key={field.key}>
                      <input
                        type={field.type ?? "text"}
                        step={field.step}
                        value={draft[field.key] === null || draft[field.key] === undefined ? "" : String(draft[field.key])}
                        readOnly={field.readonlyOnEdit}
                        onChange={(event) => updateDraft(id, field, event.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <div className="table-actions">
                      <button type="button" className="small-button" onClick={() => void saveRow(id)}>Save</button>
                      <button type="button" className="text-button" onClick={() => void deleteRow(id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="new-row">
              {config.fields.map((field) => (
                <td key={field.key}>
                  <input
                    type={field.type ?? "text"}
                    step={field.step}
                    placeholder={field.optional ? "Blank allowed" : undefined}
                    value={newRow[field.key] === null || newRow[field.key] === undefined ? "" : String(newRow[field.key])}
                    onChange={(event) => updateNewRow(field, event.target.value)}
                  />
                </td>
              ))}
              <td>
                <button type="button" className="small-button add" onClick={() => void addRow()}>
                  Add row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {status.type === "loading" && <p className="loading-note">Loading…</p>}
    </div>
  );
}

function TaxEstimatorPage() {
  const [taxCode, setTaxCode] = useState("");
  const [payslipMonth, setPayslipMonth] = useState("");
  const [yearToDateTaxablePay, setYearToDateTaxablePay] = useState("");
  const [yearToDateTaxPaid, setYearToDateTaxPaid] = useState("");
  const [submittedEstimate, setSubmittedEstimate] = useState<NonNullable<ReturnType<typeof estimateTaxBand>> | null>(null);
  const [estimatorError, setEstimatorError] = useState("");

  const clearSubmittedEstimate = () => {
    setSubmittedEstimate(null);
    setEstimatorError("");
  };

  const handleTaxEstimatorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEstimate = estimateTaxBand(taxCode, Number(payslipMonth), yearToDateTaxablePay, yearToDateTaxPaid);
    if (!nextEstimate) {
      setSubmittedEstimate(null);
      setEstimatorError("Please complete all four fields with figures from your payslip.");
      return;
    }
    setEstimatorError("");
    setSubmittedEstimate(nextEstimate);
  };

  return (
    <>
      <main>
        <section className="intro">
          <BrandHeader />
          <h1>Tax rate estimator</h1>
          <p>Use figures from your payslip to estimate whether you are likely to pay tax at 20%, 40%, or 45%.</p>
        </section>

        <section className="service-panel tax-estimator">
          <h2>Estimate your tax rate</h2>
          <p className="form-hint">
            Use the latest payslip you have available. Your tax code shows on your payslip, and the year-to-date taxable pay and tax paid figures usually show in the bottom left-hand corner.
          </p>

          <form onSubmit={handleTaxEstimatorSubmit}>
            <div className="question-block">
              <label htmlFor="estimator-tax-code">Tax code</label>
              <input
                id="estimator-tax-code"
                value={taxCode}
                onChange={(event) => {
                  setTaxCode(event.target.value);
                  clearSubmittedEstimate();
                }}
                placeholder="For example 1257L"
                autoComplete="off"
                required
              />
            </div>

            <div className="question-block">
              <label htmlFor="estimator-payslip-month">Which month's payslip are you using?</label>
              <select
                id="estimator-payslip-month"
                value={payslipMonth}
                onChange={(event) => {
                  setPayslipMonth(event.target.value);
                  clearSubmittedEstimate();
                }}
                required
              >
                <option value="">Select payslip month</option>
                {payslipMonthOptions.map((option) => (
                  <option key={option.monthNumber} value={option.monthNumber}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="question-block">
              <label htmlFor="estimator-taxable-pay">Year-to-date taxable pay</label>
              <input
                id="estimator-taxable-pay"
                value={yearToDateTaxablePay}
                onChange={(event) => {
                  setYearToDateTaxablePay(event.target.value);
                  clearSubmittedEstimate();
                }}
                placeholder="For example 12500.00"
                inputMode="decimal"
                required
              />
            </div>

            <div className="question-block">
              <label htmlFor="estimator-tax-paid">Year-to-date tax paid</label>
              <input
                id="estimator-tax-paid"
                value={yearToDateTaxPaid}
                onChange={(event) => {
                  setYearToDateTaxPaid(event.target.value);
                  clearSubmittedEstimate();
                }}
                placeholder="For example 1600.00"
                inputMode="decimal"
                required
              />
            </div>

            {estimatorError && <div className="message error">{estimatorError}</div>}

            <div className="button-row">
              <button className="service-button" type="submit">
                Continue
              </button>
            </div>
          </form>

          {submittedEstimate ? (
            <div className="estimator-result">
              <h3>Estimated tax rate</h3>
              <div className="estimator-rate">{percent(submittedEstimate.estimatedRate)}</div>
              <p>
                Use the {percent(submittedEstimate.estimatedRate)} income tax option in CARculator unless your Payroll team or HMRC tells you otherwise.
              </p>
              <dl>
                <div>
                  <dt>Estimated annual taxable pay</dt>
                  <dd>{currency(submittedEstimate.estimatedAnnualTaxablePay)}</dd>
                </div>
                <div>
                  <dt>Payslip month used</dt>
                  <dd>{submittedEstimate.payslipMonth} ({submittedEstimate.taxYearMonthsUsed} month{submittedEstimate.taxYearMonthsUsed === 1 ? "" : "s"} of tax-free pay)</dd>
                </div>
                <div>
                  <dt>Personal allowance used to date</dt>
                  <dd>{currency(submittedEstimate.allowanceUsedToDate)}</dd>
                </div>
                <div>
                  <dt>Taxable pay after allowance to date</dt>
                  <dd>{currency(submittedEstimate.taxablePayAfterAllowance)}</dd>
                </div>
                <div>
                  <dt>Estimated annual taxable pay after allowance</dt>
                  <dd>{currency(submittedEstimate.estimatedAnnualTaxedPay)}</dd>
                </div>
                <div>
                  <dt>Estimated annual tax paid</dt>
                  <dd>{currency(submittedEstimate.estimatedAnnualTaxPaid)}</dd>
                </div>
                <div>
                  <dt>Tax paid as a percentage of taxable pay to date</dt>
                  <dd>{percent(submittedEstimate.effectiveTaxRateToDate)}</dd>
                </div>
                <div>
                  <dt>Tax paid as a percentage of taxable pay after allowance</dt>
                  <dd>{percent(submittedEstimate.effectiveTaxedPayRate)}</dd>
                </div>
                <div>
                  <dt>Tax code note</dt>
                  <dd>{submittedEstimate.taxCodeNote}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="notice estimator-caveat">
            This is an estimate only. Your actual tax position can be affected by tax-code changes, previous employments, benefits, arrears, and payroll adjustments.
          </div>

          <div className="button-row">
            <button className="service-button" type="button" onClick={() => window.close()}>
              Close this window
            </button>
          </div>
        </section>
      </main>
      <CopyrightFooter />
    </>
  );
}

export function App() {
  const [view, setView] = useState<"quote" | "admin" | "tax-estimator">(
    window.location.hash === "#admin"
      ? "admin"
      : window.location.hash === "#tax-estimator"
        ? "tax-estimator"
        : "quote"
  );
  const [quoteApiKey, setQuoteApiKey] = useState(
    () => window.sessionStorage.getItem("lease-car-quote-key") ?? ""
  );
  const [draftQuoteApiKey, setDraftQuoteApiKey] = useState(quoteApiKey);
  const [quoteAccessError, setQuoteAccessError] = useState("");
  const [checkingQuoteAccess, setCheckingQuoteAccess] = useState(false);

  useEffect(() => {
    function updateViewFromHash() {
      setView(
        window.location.hash === "#admin"
          ? "admin"
          : window.location.hash === "#tax-estimator"
            ? "tax-estimator"
            : "quote"
      );
    }
    window.addEventListener("hashchange", updateViewFromHash);
    return () => window.removeEventListener("hashchange", updateViewFromHash);
  }, []);

  async function unlockQuoteSystem(event: FormEvent) {
    event.preventDefault();
    setCheckingQuoteAccess(true);
    setQuoteAccessError("");
    const nextKey = draftQuoteApiKey.trim();
    try {
      const response = await fetch(`${API_BASE_URL}/quote-access`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-quote-api-key": nextKey
        }
      });
      if (response.status === 401) throw new Error("The passkey is not correct.");
      if (!response.ok) throw new Error("CARculator could not contact the quote service. Please try again.");
      window.sessionStorage.setItem("lease-car-quote-key", nextKey);
      setQuoteApiKey(nextKey);
    } catch (error) {
      setQuoteAccessError(
        error instanceof TypeError
          ? "CARculator could not contact the quote service. Please refresh the page and try again."
          : error instanceof Error
            ? error.message
            : "The passkey could not be checked."
      );
    } finally {
      setCheckingQuoteAccess(false);
    }
  }

  if (view === "admin") {
    return (
      <>
        <main className="admin-layout">
          <AdminPage />
        </main>
        <CopyrightFooter />
      </>
    );
  }

  if (view === "tax-estimator") {
    return <TaxEstimatorPage />;
  }

  if (!quoteApiKey) {
    return (
      <>
        <main>
          <section className="intro">
            <BrandHeader />
            <h1>Welcome to CARculator</h1>
            <p>Enter the scheme passkey to compare lease car salary sacrifice costs.</p>
          </section>
          <section className="service-panel">
            <form className="admin-unlock" onSubmit={unlockQuoteSystem}>
              <h2>Access CARculator</h2>
              <PrivacyNotice />
              <label className="quote-access-label" htmlFor="quote-api-key">Passkey</label>
              <input
                id="quote-api-key"
                type="password"
                value={draftQuoteApiKey}
                onChange={(event) => setDraftQuoteApiKey(event.target.value)}
                autoComplete="current-password"
                required
              />
              {quoteAccessError && <div className="message error">{quoteAccessError}</div>}
              <button className="service-button" type="submit" disabled={checkingQuoteAccess}>
                {checkingQuoteAccess ? "Checking…" : "Continue"}
              </button>
            </form>
          </section>
        </main>
        <CopyrightFooter />
      </>
    );
  }

  return (
    <>
      <main>
        <section className="intro">
          <BrandHeader />
          <h1>CARculator</h1>
          <p>Answer a few questions, choose up to five vehicles, and compare the estimated net monthly cost.</p>
        </section>

        <QuoteRequestPage quoteApiKey={quoteApiKey} />
      </main>
      <CopyrightFooter />
    </>
  );
}
