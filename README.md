# CARculator

CARculator is a South West Yorkshire Partnership Teaching NHS FT lease-car salary sacrifice calculator.

Employees can:

- select their employer, tax rate, pension position and annual mileage;
- optionally complete a National Minimum Wage eligibility check;
- search vehicles that have a rental available at their chosen mileage;
- compare up to five estimates using the cheapest available rental;
- view monthly salary sacrifice, estimated net cost and company-car tax.

The administration page maintains employer costs, pension rates, tax rates, National
Insurance rates, CO2 bands, electric mileage bands, National Minimum Wage rates and
Agenda for Change pay points.

## Access

The public calculator is protected by a server-validated passcode. Administration uses
a separate API key. Neither credential is stored in this repository.

## Technology

- React and TypeScript frontend
- AWS API Gateway and Lambda
- Microsoft SQL Server on Amazon RDS
- Terraform infrastructure
- GitHub Pages frontend hosting

## Local development

```sh
npm install
npm run dev
```

Open `http://localhost:5173/`. The local app calls the deployed AWS API unless
`VITE_API_BASE_URL` is supplied.

## Build

```sh
npm run build
```

## Deployment

Pushing `main` runs the GitHub Pages workflow. AWS infrastructure is managed from
`infra/api`.

## Data protection

CARculator calculates estimates immediately and does not store employee quote
selections. The former `QuoteRequests` table and write API have been removed.

© South West Yorkshire Partnership Teaching NHS FT
