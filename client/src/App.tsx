import { FormEvent, useEffect, useMemo, useState } from "react";

type Vehicle = {
  vehicleId: string;
  vehicleName: string;
  listPrice: number;
  fuelType: string;
  co2Emissions: number | null;
  electricRange: number | null;
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
  payStep: string;
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
};

type QuoteResult = {
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
    <footer className="site-footer">
      © {new Date().getFullYear()} South West Yorkshire NHS Foundation Trust
    </footer>
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
      { key: "taxBand", label: "Tax band", readonlyOnEdit: true },
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
      { key: "payStep", label: "Pay step" },
      { key: "annualSalary", label: "Annual salary", type: "number", step: "0.01" },
      { key: "effectiveFrom", label: "Effective from" },
      { key: "displayOrder", label: "Display order", type: "number", step: "1" }
    ],
    emptyRow: { band: "", payStep: "", annualSalary: 0, effectiveFrom: "2025-04-01", displayOrder: 0 }
  }
];

const mileageOptions = [6000, 8000, 10000, 12000, 15000];

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
  return `Band ${rate.band} ${rate.payStep}: ${currency(rate.annualSalary)}`;
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
  annualMileage,
  quoteApiKey
}: {
  index: number;
  value: Vehicle | null;
  onChange: (vehicle: Vehicle | null) => void;
  excludedIds: string[];
  vehicleType: string;
  annualMileage: number;
  quoteApiKey: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Vehicle[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if ((query.trim().length < 2 && !vehicleType) || value) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ search: query, limit: "8" });
        if (vehicleType) params.set("fuelType", vehicleType);
        params.set("annualMileage", String(annualMileage));
        const response = await fetch(`${API_BASE_URL}/vehicles?${params}`, {
          signal: controller.signal,
          headers: { "x-quote-api-key": quoteApiKey }
        });
        if (response.ok) {
          const body = await response.json();
          setResults(body.items.filter((vehicle: Vehicle) => !excludedIds.includes(vehicle.vehicleId)));
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value, vehicleType, annualMileage, excludedIds.join(",")]);

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
            onFocus={() => {
              if (vehicleType && !query) setQuery(" ");
            }}
            placeholder={vehicleType ? `Search ${vehicleType.toLowerCase()} vehicles` : "Type at least 2 letters to search"}
            autoComplete="off"
          />
          {searching && <span className="searching">Searching catalogue…</span>}
          {results.length > 0 && (
            <div className="search-results">
              {results.map((vehicle) => (
                <button
                  type="button"
                  key={vehicle.vehicleId}
                  onClick={() => {
                    onChange(vehicle);
                    setQuery("");
                    setResults([]);
                  }}
                >
                  <strong>{vehicle.vehicleName}</strong>
                  <span>{vehicle.fuelType} · £{vehicle.listPrice.toLocaleString("en-GB")}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QuoteRequestPage({ quoteApiKey }: { quoteApiKey: string }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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
  const [afcPayRateId, setAFCPayRateId] = useState("");
  const [contractedHours, setContractedHours] = useState("37.5");
  const [annualMileage, setAnnualMileage] = useState(6000);
  const [vehicleType, setVehicleType] = useState("");
  const [vehicles, setVehicles] = useState<(Vehicle | null)[]>([null, null, null, null, null]);
  const [results, setResults] = useState<QuoteResult[]>([]);
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
    if (!selectedAFCPayRate) return "Please choose your Agenda for Change annual salary.";
    const hours = Number(contractedHours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 80) return "Please enter contracted hours between 1 and 80.";
    return "";
  }

  function calculateNMWHourlyRate(salarySacrificeAnnual: number) {
    if (skipNMW || !selectedNMWRate || !selectedAFCPayRate) {
      return { skipped: true, blocked: false, hourlyRate: null, minimumRate: null };
    }
    const hours = Number(contractedHours);
    const annualFullTimeAfterSacrifice = Number(selectedAFCPayRate.annualSalary) - salarySacrificeAnnual;
    const annualPartTimeEarnings = (annualFullTimeAfterSacrifice / 37.5) * hours;
    const hourlyRate = annualPartTimeEarnings / 52.1428 / hours;
    const minimumRate = Number(selectedNMWRate.hourlyRate);
    return {
      skipped: false,
      blocked: hourlyRate < minimumRate,
      hourlyRate,
      minimumRate
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
        const taxSavingAnnual = salarySacrificeAnnual * taxRate;
        const niSavingAnnual = salarySacrificeAnnual * niRate;
        const pensionSavingAnnual = salarySacrificeAnnual * pensionContributionRate;
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

      setResults(nextResults);
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
        <span className={step >= 1 ? "active" : ""}>1. Your details</span>
        <span className={step >= 2 ? "active" : ""}>2. Minimum wage check</span>
        <span className={step >= 3 ? "active" : ""}>3. Choose vehicles</span>
        <span className={step >= 4 ? "active" : ""}>4. Your quote</span>
      </div>

      {step === 1 && (
        <form onSubmit={nextFromDetails}>
          <h2>Your details</h2>
          <p className="form-hint">These answers are used only to calculate the estimated net monthly cost.</p>

          <div className="question-block">
            <label htmlFor="employer">Employer</label>
            <select id="employer" value={employerId} onChange={(event) => setEmployerId(event.target.value)} required>
              {employers.map((employer) => (
                <option key={employer.employerId} value={employer.employerId}>{employer.organisation}</option>
              ))}
            </select>
          </div>

          <div className="question-block">
            <label htmlFor="income-tax">What level of income tax do you pay?</label>
            <select id="income-tax" value={taxBand} onChange={(event) => setTaxBand(event.target.value)} required>
              {incomeTaxRates.map((rate) => (
                <option key={rate.taxBand} value={rate.taxBand}>{rate.taxBand} rate ({percent(rate.taxRate)})</option>
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
              <label htmlFor="pension-tier">Level of pensionable earnings per year</label>
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
                <select id="age-band" value={ageBand} onChange={(event) => setAgeBand(event.target.value)} required>
                  {nationalMinimumWageRates.map((rate) => (
                    <option key={rate.nmwRateId} value={rate.ageBand}>
                      {rate.ageBand} — minimum {currency(rate.hourlyRate)} per hour
                    </option>
                  ))}
                </select>
              </div>

              <div className="question-block">
                <label htmlFor="afc-pay">Agenda for Change annual salary</label>
                <select id="afc-pay" value={afcPayRateId} onChange={(event) => setAFCPayRateId(event.target.value)} required>
                  {agendaForChangePayRates.map((rate) => (
                    <option key={rate.afcPayRateId} value={rate.afcPayRateId}>{afcLabel(rate)}</option>
                  ))}
                </select>
              </div>

              <div className="question-block">
                <label htmlFor="contracted-hours">Contracted hours per week</label>
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
          <p className="form-hint">Only vehicles with a rental available at {annualMileage.toLocaleString("en-GB")} miles per year are shown.</p>

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

          <div className="vehicle-grid">
            {vehicles.map((vehicle, index) => (
              <VehiclePicker
                key={index}
                index={index}
                value={vehicle}
                onChange={(nextVehicle) => updateVehicle(index, nextVehicle)}
                excludedIds={selectedIds.filter((id) => id !== vehicle?.vehicleId)}
                vehicleType={vehicleType}
                annualMileage={annualMileage}
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

          <div className="result-list">
            {results.map((result) => (
              <article className="quote-result" key={result.vehicle.vehicleId}>
                <div>
                  <h3>{result.vehicle.vehicleName}</h3>
                  <p>{result.vehicle.fuelType} · List price {currency(result.vehicle.listPrice)} · BIK {percent(result.bikRate)} ({result.bikSource})</p>
                </div>
                {result.nmwBlocked ? (
                  <div className="message error">
                    This car would take the estimated hourly rate to {currency(result.nmwHourlyRate ?? 0)}, which is below the National Minimum Wage rate of {currency(result.nmwMinimumRate ?? 0)} for the selected age range.
                  </div>
                ) : (
                  <>
                    <div className="result-price">
                      <span>Estimated net cost</span>
                      <strong>{currency(result.netMonthly)}</strong>
                      <small>per month</small>
                    </div>
                    <dl>
                      <div><dt>Monthly salary sacrifice</dt><dd>{currency(result.salarySacrificeMonthly)}</dd></div>
                      <div><dt>Monthly cost</dt><dd>{currency(result.netMonthly)}</dd></div>
                      <div><dt>Annual rental figure</dt><dd>{currency(result.annualRental)}</dd></div>
                      <div><dt>Company car tax</dt><dd>{currency(result.companyCarTaxAnnual / 12)} / month</dd></div>
                    </dl>
                    {result.nmwSkipped && (
                      <div className="notice">
                        Eligibility subject to National Minimum Wage check.
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>

          <div className="button-row">
            <button className="secondary-service-button" type="button" onClick={() => setStep(3)}>Back to vehicles</button>
            <button className="service-button" type="button" onClick={() => setStep(1)}>Start again</button>
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
      <AdminTable key={selectedTable.slug} config={selectedTable} apiKey={apiKey} />
    </section>
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

export function App() {
  const [view, setView] = useState<"quote" | "admin">(
    window.location.hash === "#admin" ? "admin" : "quote"
  );
  const [quoteApiKey, setQuoteApiKey] = useState(
    () => window.sessionStorage.getItem("lease-car-quote-key") ?? ""
  );
  const [draftQuoteApiKey, setDraftQuoteApiKey] = useState(quoteApiKey);
  const [quoteAccessError, setQuoteAccessError] = useState("");
  const [checkingQuoteAccess, setCheckingQuoteAccess] = useState(false);

  useEffect(() => {
    function updateViewFromHash() {
      setView(window.location.hash === "#admin" ? "admin" : "quote");
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
      if (!response.ok) throw new Error("The passcode is not correct.");
      window.sessionStorage.setItem("lease-car-quote-key", nextKey);
      setQuoteApiKey(nextKey);
    } catch (error) {
      setQuoteAccessError(error instanceof Error ? error.message : "The passcode could not be checked.");
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

  if (!quoteApiKey) {
    return (
      <>
        <main>
          <section className="intro">
            <BrandHeader />
            <h1>Welcome to CARculator</h1>
            <p>Enter the scheme passcode to compare lease car salary sacrifice costs.</p>
          </section>
          <section className="service-panel">
            <form className="admin-unlock" onSubmit={unlockQuoteSystem}>
              <h2>Access CARculator</h2>
              <label htmlFor="quote-api-key">Passcode</label>
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
