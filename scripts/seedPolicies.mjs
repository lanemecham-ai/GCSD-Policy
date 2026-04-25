/**
 * Downloads all GCSD policies from BoardBook as PDFs, extracts their text,
 * and writes server/policySeed.json for the Express server to import.
 *
 * Run once: node scripts/seedPolicies.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'server', 'policySeed.json');

// Extract GUID from boardbook viewer URL
function guid(url) {
  return new URL(url).searchParams.get('file');
}

function downloadUrl(viewerUrl) {
  const id = guid(viewerUrl);
  return `https://meetings.boardbook.org/Documents/DownloadPDF/${id}?org=3241`;
}

function makeId(code) {
  return 'policy-' + code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

const POLICIES = [
  // ── Section B — Board ──────────────────────────────────────────────────────
  { code: 'BA',    title: 'Board Legal Status',                                              section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4c02c47b-aa58-4965-9995-65e1ecb82fb4' },
  { code: 'BAA',   title: 'Board Powers and Duties',                                         section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=cb3ab556-818b-4221-a01e-12caecb1e758' },
  { code: 'BAB',   title: 'Board Fiscal Responsibilities',                                   section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bd7e199f-afc3-44b3-b512-4c7dcf23813d' },
  { code: 'BBA',   title: 'Board Members: Eligibility and Qualifications',                   section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bbb4f4a8-8554-421d-bee0-6b4890722575' },
  { code: 'BBAA',  title: 'Board Members: Student Members',                                  section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ce857e02-9cee-490c-8158-08e898fd8cbb' },
  { code: 'BBB',   title: 'Board Members: Elections and Redistricting',                      section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bd162a07-fd73-4112-8e96-b199673b4b50' },
  { code: 'BBC',   title: 'Board Members: Vacancies on the Board',                           section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e48c1b5e-bfab-4a24-b28c-e495d5cca25a' },
  { code: 'BBD',   title: 'Board Members: Conflicts of Interest',                            section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3f804d0c-3009-43e1-abfa-287a78b16e5f' },
  { code: 'BBF1',  title: 'Board Members: Code of Ethics (1)',                               section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=19228423-7513-466e-9e07-32520dd74ab4' },
  { code: 'BBF2',  title: 'Board Members: Code of Ethics (2)',                               section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4b70110d-5785-45f3-85ad-5687144b6aab' },
  { code: 'BBG',   title: 'Board Members: Compensation',                                     section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=446daff9-7b0a-4bba-bf18-299077288734' },
  { code: 'BCA',   title: 'Foundations and Basic Commitments: District Mission Statement',   section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=15783ce9-234d-4df1-8d98-db1acd9302aa' },
  { code: 'BCB',   title: 'Foundations and Basic Commitments: Belief Statements',            section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6f25d06b-8263-4033-a386-910a2d5e3358' },
  { code: 'BCC',   title: 'Foundations and Basic Commitments: District Educational Philosophy', section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b8374606-f118-40c0-8344-f52d333da2b4' },
  { code: 'BD',    title: 'Board Internal Operation',                                        section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1dd60780-4aed-461b-a463-ce2eabaaaece' },
  { code: 'BDA',   title: 'Board Internal Organization: Other Officers',                     section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=39f88ad8-89c0-4902-8a54-f9b999b419b7' },
  { code: 'BDAB',  title: 'President of the Board: Duties',                                  section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=741f78d8-2a11-43fb-b3b6-c57f7d0fa9f1' },
  { code: 'BE',    title: 'Board Meetings',                                                  section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6fc5b640-4d41-438c-b726-6dc08c0adf45' },
  { code: 'BEA',   title: 'Board Meetings: Notice Requirements',                             section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f4016c16-b3b3-4bec-8cd6-42809b52cf5c' },
  { code: 'BEB',   title: 'Board Meetings: Recordings and Minutes',                          section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=09dc4d9f-d5ae-47a0-b00f-a383b2e0d8f0' },
  { code: 'BEC',   title: 'Board Meetings: Closed Meetings',                                 section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d6ce9222-30a9-43ae-8466-c876dc82112b' },
  { code: 'BED',   title: 'Board Meetings: Meeting Location',                                section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f3b06b64-0db9-4ffc-8c2e-4d49aa6ef86f' },
  { code: 'BEE1',  title: 'Board Meetings: No Electronic Meetings',                          section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=14e938e1-4873-4cc4-add2-0c295400570b' },
  { code: 'BEE2',  title: 'Board Meetings: Electronic Meetings',                             section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=568cdd82-5f7b-4d9f-9e2d-8e927ce9dcf9' },
  { code: 'BF',    title: 'Community Involvement in Education',                              section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5c910c96-bda0-4f0e-8038-9e66ada034c0' },
  { code: 'BFA',   title: 'School Closures and Boundary Changes',                            section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5ec6f705-c7f2-4ee5-8c51-27b23e272322' },
  { code: 'BJA',   title: 'Superintendent: Appointment',                                     section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=9121f8d6-23b5-4255-afe4-6a2a1a8b110a' },
  { code: 'BJB',   title: 'Superintendent: Qualifications and Responsibilities',             section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0c2b1cbe-66fd-47bb-a6ae-baf9bc477bcc' },
  { code: 'BJC',   title: 'Superintendent: Evaluation',                                      section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=8aaca796-b3b2-41d5-8177-fda3233b15da' },
  { code: 'BJD',   title: 'Superintendent: Dismissal',                                       section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=04b8f460-f30d-4a40-9c29-144abb955eac' },
  { code: 'BKA',   title: 'Business Administrator: Appointment',                             section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1ed7f324-6698-4f2e-86f3-ee062134d80c' },
  { code: 'BKB',   title: 'Business Administrator: Qualifications and Responsibilities',     section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a6746b62-bb41-4d63-a33a-0a017e2ed983' },
  { code: 'BKC',   title: 'Business Administrator: Evaluation',                              section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d607efb2-d794-4e97-b904-59f0eaf72518' },
  { code: 'BKD',   title: 'Business Administrator: Dismissal',                               section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bc132930-cbab-4514-be66-0e578acda7a2' },
  { code: 'BL',    title: 'Administrative Personnel',                                        section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c68eb08e-8eb5-42fa-8e51-ad5d0e7ec53c' },
  { code: 'BLA',   title: 'Administrative Personnel: Duties of Principals',                  section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d110c909-3e48-4b66-b391-5e973431a8ad' },
  { code: 'BLB',   title: 'Administrative Personnel: Evaluation',                            section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3ed13170-ffd2-4b2b-97fd-346f26efe4e8' },
  { code: 'BM',    title: 'Charter School Sponsorship Policy',                               section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=00ab9e08-cda1-48da-9ac8-e364990c88f9' },
  { code: 'BU',    title: 'District Annual Reports',                                         section: 'Board', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bfc9c23e-0b29-4490-a274-1a592319e65a' },

  // ── Section C — Finance & Operations ─────────────────────────────────────
  { code: 'CAA',   title: 'Revenue and Budgeting: State Revenue',                            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=dd1ea89c-8a1f-407d-a4c9-826336bbf73c' },
  { code: 'CAB',   title: 'Revenue and Budgeting: Local Revenue',                            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1f79758f-a1c8-4ad2-a962-3db296acd5dd' },
  { code: 'CABA',  title: 'Revenue and Budgeting: Local Revenue: Local Foundations',         section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=919ee9a2-c259-455f-adf1-eab689e4c27e' },
  { code: 'CAC',   title: 'Revenue and Budgeting: Budget',                                   section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f918fce7-e19f-4501-9452-dcc17028861a' },
  { code: 'CAD',   title: 'District Audit Committee',                                        section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=55ce2fea-ecc8-4ad5-b482-121a4919193c' },
  { code: 'CAE',   title: 'Capital Outlay Reporting',                                        section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=aca7681b-6966-4433-a09c-1cad35aacb18' },
  { code: 'CAF',   title: 'Financial Reporting',                                             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=cc6ae4e9-964e-4aee-92a7-662fed5eed10' },
  { code: 'CAG',   title: 'District Fiscal Responsibilities',                                section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=000eda52-0224-4ae5-9d4b-58fe71ed5858' },
  { code: 'CAH',   title: 'Program Accounting',                                              section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=9c28ed6a-6a34-467d-b7f8-4e8a96d60779' },
  { code: 'CB',    title: 'Procurement',                                                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=46cadf3a-01e1-442a-8f2b-d3c6138cfab3' },
  { code: 'CBA',   title: 'General Procurement Policies',                                    section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1ac8a958-989d-43d0-9d12-530a938f793f' },
  { code: 'CBA-S', title: 'Surplus Policy',                                                  section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4c3fb288-cdc0-4e58-8070-e6d4b7600d45' },
  { code: 'CBB',   title: 'Awarding Contracts by Bidding',                                   section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=59818886-809a-4e04-9f44-c00e82c83870' },
  { code: 'CBD',   title: 'Awarding Contracts by Request for Proposals',                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=35ffedca-0ce0-4155-953e-93945c43cb39' },
  { code: 'CBDA',  title: 'Request for Statement of Qualifications',                         section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e652f3c7-37dd-46f2-83bd-43ce22f9fd5a' },
  { code: 'CBDB',  title: 'Approved Vendor List Process',                                    section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=422e42a1-520e-4bbe-8309-f683da846df0' },
  { code: 'CBDC',  title: 'Procurement of Professional Services',                            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6c2ecd88-4163-4527-931c-e40c08b97cfc' },
  { code: 'CBE',   title: 'Small Purchases',                                                 section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=af823c29-266d-4a1b-982b-e3da5f81efed' },
  { code: 'CBE-T', title: 'Procurement/Purchasing Approval Thresholds',                      section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=8d6c5533-3d61-45e3-af2b-b8a65c0cce54' },
  { code: 'CBF',   title: 'Exceptions to Standard Procurement Processes',                    section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5c9615d5-e8c6-447f-9ce9-df05b2397fe9' },
  { code: 'CBG',   title: 'Contracts and Contract Limitations',                              section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c94c6dfe-ea7a-4c2a-8ba0-898fd9ccce11' },
  { code: 'CBH',   title: 'Interaction with Other Procurement Units',                        section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=158e7692-5bb5-4719-85ca-8ac555c4b60a' },
  { code: 'CBI',   title: 'Records of Procurement',                                         section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0a439043-73e4-4ecc-b9d7-452d68987219' },
  { code: 'CBJ',   title: 'Contractor Oversight',                                            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a6a1c717-c792-49b0-b62a-2d3a8b0a00f2' },
  { code: 'CBJA',  title: 'Education Contractor Oversight',                                  section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=06185f4d-daa6-48a4-94eb-894da9f5a5d2' },
  { code: 'CBK',   title: 'Child Nutrition Program Procurement',                             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1cf43c8b-2891-4960-983a-b2e18cb079c8' },
  { code: 'CC',    title: 'Procurement of Construction',                                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=41933e59-ee8c-42f1-ade6-6ee61303a0a1' },
  { code: 'CCA',   title: 'School Construction Bidding',                                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=abce5873-7870-4196-8a46-270077030d6b' },
  { code: 'CCB',   title: 'Construction Bonds and Security',                                 section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=36a45a6b-e256-4e2d-b5cc-8a33cfa12c8b' },
  { code: 'CCC',   title: 'Limitation on Change Orders',                                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c8e76960-3ec6-4081-b0b1-d9e468b06634' },
  { code: 'CCD',   title: 'Drug and Alcohol Testing for Construction Projects',              section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bc4198b8-df34-4211-a84b-9d60954eef44' },
  { code: 'CCE',   title: 'Construction Management Methods',                                 section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3a090d3d-7c28-4c35-890c-5e786c2d27b6' },
  { code: 'CCF',   title: 'Procurement of Design Professional Services',                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d8f6c840-0bf9-4626-bbd1-d2c867e99d6e' },
  { code: 'CCG',   title: 'Construction and School-Site Acquisition Requirements',           section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=cfe0986f-9142-4f27-8d06-f3aabfde26ea' },
  { code: 'CD',    title: 'Appeals and Oversight of Procurement',                            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=334dae16-a6b6-454f-b1b6-000b19f26128' },
  { code: 'CDA',   title: 'Procurement Protests',                                            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=48539372-6ea5-4529-ae4a-32aeca264e77' },
  { code: 'CDB',   title: 'Procurement Protest Appeals',                                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f29ee18c-c019-41aa-9b2c-8da19027aff8' },
  { code: 'CDD',   title: 'Procurement Violations and Offenses',                             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c3893bdd-34d4-4f7a-946e-90bb0289026e' },
  { code: 'CE',    title: 'School Safety',                                                   section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f3222233-55e7-42fd-b096-6f06453ad182' },
  { code: 'CEA',   title: 'School Safety: Video and Audio Surveillance',                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=7fb38137-a68a-402a-901c-5d6faf147d50' },
  { code: 'CEB',   title: 'District Emergency Response Plan',                                section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ecae0158-e915-4cd9-968f-9d6aec59ea35' },
  { code: 'CEC',   title: 'Contracts for School Resource Officer Services',                  section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=885a2059-bfbd-4373-800e-9c8e4fb6369a' },
  { code: 'CED',   title: 'Contracts for Armed School Security Guard Services',              section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d742cd1f-a3db-46ff-ba1d-e1dfa2d6e6f6' },
  { code: 'CED-T', title: 'Technology Security',                                             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f2a1e273-4234-404b-84ed-deefde233e70' },
  { code: 'CFA',   title: 'Use of School Facilities: Employee Access',                       section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c9214128-67ae-4d32-9d01-0488cbbbd88d' },
  { code: 'CFB',   title: 'Use of School Facilities: Employee Use of Equipment',             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e943f446-ea4f-4b82-81e4-f9ced86aac87' },
  { code: 'CG',    title: 'School Plant',                                                    section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=675578d0-e4c1-488d-a8ee-2392fbb00717' },
  { code: 'CGA',   title: 'School Plant: Hazardous Materials',                               section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=40afc39d-f13e-40e7-b41f-5face6d482ce' },
  { code: 'CGA-2', title: 'School Plant: Hazardous Materials Exhibit 2',                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=06ee4e32-a4f2-4671-a5a4-134b5303c466' },
  { code: 'CGA-3', title: 'School Plant: Hazardous Materials Exhibit 3',                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=66443a0f-be8e-4c32-9887-1e08dad97e75' },
  { code: 'CH',    title: 'Accessibility by Disabled Persons',                               section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=00fe875f-5a69-4051-9c07-8f983f7e4a0c' },
  { code: 'CI',    title: 'Risk Management Procedures',                                      section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=dc3d0fe0-719d-43c9-a274-4950690497ec' },
  { code: 'CI-E1', title: 'Risk Management Guidelines (Exhibit 1)',                          section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4c7d313a-70fd-48ea-b733-3b8acd92926d' },
  { code: 'CJ',    title: 'Transportation',                                                  section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a1a53e16-9fc6-4028-9bae-6ef74474c936' },
  { code: 'CJAA',  title: 'Transportation: Planning and Funding — Funding',                  section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=97ee78cc-253e-4314-a14e-01fe6f395c29' },
  { code: 'CJAB',  title: 'Transportation: Planning and Funding — Evaluation',               section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=fb7f07c4-bde9-4939-a586-0056ecc324d5' },
  { code: 'CJAC',  title: 'Transportation: Planning and Funding — Route Planning',           section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c54d56cd-dfd2-401e-94b7-c2f4a69fa094' },
  { code: 'CJAD',  title: 'Transportation: Planning and Funding — School Site Selection',    section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=78d36120-938a-4120-bef4-95ac90f371ba' },
  { code: 'CJBA',  title: 'Transportation: Personnel — Director of Transportation',          section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2aad1812-485f-4650-9648-49e918ae72c9' },
  { code: 'CJBB',  title: 'Transportation: Personnel — Operators and Mechanics',             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ff561f72-0213-4d0f-9be0-bb7fc192fba0' },
  { code: 'CJBC',  title: 'Transportation: Personnel — Training',                            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4d7c9e0a-b7c8-45cd-960b-b9de4178fcaf' },
  { code: 'CJCA',  title: 'Transportation: Equipment — Buses',                               section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=add04d9b-9723-4779-a2d7-c6a598358dfe' },
  { code: 'CJCB',  title: 'Transportation: Equipment — Inspection and Maintenance',          section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=723693d2-2fbe-46d3-b6af-0a07e6bdfeeb' },
  { code: 'CJCC',  title: 'Transportation: Equipment — Advertising on School Buses',         section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ff1bbd79-1d09-42aa-a46c-28bf9e8120c4' },
  { code: 'CJDA',  title: 'Transportation: Operations — Communications',                     section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a71b78df-149f-4a0b-b938-4b0a7dcb7bd6' },
  { code: 'CJDB',  title: 'Transportation: Operations — Pupil Management',                   section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=339bfe9c-fa26-4c32-9aca-65096dd0059a' },
  { code: 'CJDBA', title: 'Transportation: Operations — Unauthorized Persons on Buses',      section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d825dc61-a4f2-4101-9fa9-31c188853157' },
  { code: 'CJDBB', title: 'Transportation: Operations — Charter School Students',            section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1e1e5c71-fdeb-429c-8ce7-092c10a60bb3' },
  { code: 'CJDC',  title: 'Transportation: Operations — Lights and Railroad Crossings',      section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f1f2a3ca-ceae-48d5-9cca-a228eee269fc' },
  { code: 'CJDD',  title: 'Transportation: Operations — Emergencies',                        section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a5ccdf45-548e-420c-ae70-20923c7ecc08' },
  { code: 'CJDE',  title: 'Transportation: Operations — Rental of School Buses',             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=dfb3e14d-7963-4423-b9d5-e4a99f457294' },
  { code: 'CJDF',  title: 'Transportation: Operations — District Vehicles',                  section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=aceb9b6e-bce9-42ab-a741-1a8664949951' },
  { code: 'CJDG',  title: 'Transportation: Operations — Electronic and Telecommunications Devices', section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=cdb892cd-3a97-4de4-b4bd-0e46cbdbba86' },
  { code: 'CJDH',  title: 'Transportation: Operations — Post-Route Inspections',             section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3550a831-36e0-40e2-9198-c813a08cb21a' },
  { code: 'CK',    title: 'Cash Receipts and Expenditures',                                  section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b1fe5cc8-bda5-4b38-bbcc-51eebf581112' },
  { code: 'CKA',   title: 'Credit/Purchase Cards',                                           section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d8542222-d2ec-4782-9da9-9f061c1f12bf' },
  { code: 'CKB',   title: 'Travel',                                                          section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ef7f8d33-92fd-4ea5-bfbe-a8ab3ac46cea' },
  { code: 'CKC',   title: 'Reimbursement Requests',                                          section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=adca4909-77c6-497f-b9f8-d47d78dcbb85' },
  { code: 'CKD',   title: 'Purchase Orders',                                                 section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0f56f6af-7db7-4a96-98a7-cce298c24b76' },
  { code: 'CKE',   title: 'Issuance of Checks',                                              section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ff40bc0c-ead7-4abd-8804-1446ed54b50d' },
  { code: 'CKF',   title: 'Journal Entries and Electronic Fund Transfers',                   section: 'Finance & Operations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3ca57b4e-ca87-4029-ae96-380d36348d24' },

  // ── Section D — Personnel ─────────────────────────────────────────────────
  { code: 'DAA',    title: 'Employment Objectives: Nondiscrimination',                       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4747a2a7-77c6-485e-ba82-e1a042102e12' },
  { code: 'DAB',    title: 'Employment: Licensure',                                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e67d6c78-5503-44c7-a6ad-183888d70f4a' },
  { code: 'DAB-L',  title: 'LEA-Specific Teacher License Endorsement',                       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=90c3d408-4304-4570-aa91-70a32255620f' },
  { code: 'DABA',   title: 'Employment: Paraprofessional Qualifications',                    section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6ac5cee6-f6e8-41c7-8a87-fb859224977f' },
  { code: 'DABB',   title: 'Employment: Student Support Scope of Practice',                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c150b708-be11-42c0-a85f-3a1afed5fc4e' },
  { code: 'DAC',    title: 'Employment: Background Checks',                                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=8ee6f164-1582-48e8-a610-cd03d75d3a97' },
  { code: 'DACA',   title: 'Employment: Personal Reporting of Arrests and Convictions',      section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=84b0ce50-5faa-4bcd-8c27-bfce5d869164' },
  { code: 'DAD',    title: 'Employment: Scope of Employment',                                section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b0b0cc3d-0a30-43b5-b9e2-488497b1d9bd' },
  { code: 'DADA',   title: 'Employment: Transfers',                                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=fde1c3ea-ffc5-47ac-9dc2-e9c763696fb9' },
  { code: 'DAE',    title: 'Employee Conflict of Interest',                                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b1360197-351c-40c2-887a-8e98744ae13d' },
  { code: 'DAF',    title: 'Ethics Policy: Private but Public Education-Related Activities', section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d3477f60-131b-4966-ba38-51e2b6afb023' },
  { code: 'DAG',    title: 'Employee Drug Policy',                                           section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=dd6933ea-a6d0-45c4-96b0-5b16b8653068' },
  { code: 'DAG-E1', title: 'Employee Drug Policy (Exhibit 1)',                               section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ec971fa2-6429-497f-a7df-b83bbef37ef0' },
  { code: 'DAH',    title: 'Drug Testing of Bus Drivers',                                    section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=62b9e1d2-199f-46be-be6f-8e3fba72f454' },
  { code: 'DAHA',   title: 'Drug Testing of Other Employees',                                section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6dcebffc-f858-4c55-972c-450d22d94f79' },
  { code: 'DAI',    title: 'Staff Code of Conduct',                                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ac215a77-1523-46f3-bc19-0bb01ec13e57' },
  { code: 'DAJ',    title: 'Accommodations for Employee Religious Belief or Conscience',     section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=43fb9391-e316-458e-af87-e6c4ad5d7d3e' },
  { code: 'DBA',    title: 'Contracts: Certified Employees',                                 section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5d8173e8-f7a7-4447-8095-af24a52512f6' },
  { code: 'DBA-S',  title: 'Salary Step Placement',                                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=02e2ce03-183a-46db-9480-2c16c7cb864e' },
  { code: 'DBA-L',  title: 'Teacher Lane Change Policy',                                     section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c3c13235-dec1-4443-a72c-a8775ae01bb4' },
  { code: 'DBB',    title: 'Contracts: Education Support Professionals',                     section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=93584934-cf52-4d9c-9f31-fc46cca8c44c' },
  { code: 'DBBA',   title: 'Employment Requirements: Physical Examinations and Communicable Diseases', section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=897d0d2d-c4b0-4cec-a831-37b549250376' },
  { code: 'DBC',    title: 'No Implied Contract Rights',                                     section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b78d3d8e-944d-48f0-84dc-d69f123cde89' },
  { code: 'DBD',    title: 'Limitations on Extra Duty Assignments',                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=125952f4-4168-43e2-9238-f3229b04dac2' },
  { code: 'DBG',    title: 'Reemployment of Retired Employees',                              section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a2687bb7-1562-46b4-b073-0bbb3ed392b0' },
  { code: 'DCA',    title: 'Administration Relations',                                       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=52cfe046-f714-41f3-859e-b3ba59c64a4d' },
  { code: 'DCB',    title: 'Mediation of Contract Negotiations',                             section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=46a023cf-0ec4-45b7-82a7-5ecb003b39f1' },
  { code: 'DCC',    title: 'Association and Organization Participation',                     section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4dcdcd32-a65e-4e21-b8e5-a55150f431be' },
  { code: 'DDA',    title: 'Reporting of Child Abuse',                                       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0ed8e3be-6861-4873-9cb9-5808febe419f' },
  { code: 'DDAA',   title: 'Child Sexual Abuse and Human Trafficking Prevention Education for Employees', section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=62408474-1b63-4872-b6b2-0cab8be28b0d' },
  { code: 'DDB',    title: 'Reporting of Student Prohibited Acts',                           section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4c3bc5d0-f390-414d-8e23-e5ad6ba6d768' },
  { code: 'DDC',    title: 'Reporting Substantial Threats Against a School',                 section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0979f98a-dd0e-4ecf-a8ec-53161199e73d' },
  { code: 'DEA',    title: 'Workers Compensation',                                           section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b4139665-38b4-4ed5-9c2e-b04a50c09571' },
  { code: 'DEAB',   title: 'Procurement of Workers Compensation Insurance',                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=31347771-ff99-4096-ac4d-91cb36818e62' },
  { code: 'DEAC',   title: 'Personal Protective Equipment',                                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=60bafaec-f199-4511-b7d8-93196eeecf1d' },
  { code: 'DEB',    title: 'Retirement',                                                     section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1079d119-06c6-42de-9d4d-aae887f318ae' },
  { code: 'DEB-R',  title: 'Retirement Exemption Eligibility',                               section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=126e001f-7e40-4d4a-9ce0-fe44769a261c' },
  { code: 'DEC',    title: 'Risk Management Coverage for Employees',                         section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a219e26e-cde1-40d5-9502-5b058f406976' },
  { code: 'DEC-E1', title: 'Risk Management Coverage for Employees (Exhibit 1)',             section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4527a158-7fdb-4c09-9ced-f1c00f39dedb' },
  { code: 'DED',    title: 'Overtime',                                                       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5dca38b9-e3a1-4493-aa1c-b9924cfd90a8' },
  { code: 'DFA',    title: 'Educator Induction, Mentoring, and Professional Learning',       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d6697345-25c3-4678-9ed9-33d7e11c38d2' },
  { code: 'DFB',    title: 'Employee Suggestion Program',                                    section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5927ed37-492b-41a6-aa92-de84eb1bb07c' },
  { code: 'DFC',    title: 'Employee Surveys',                                               section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d34a99d2-89e3-4cfd-bf6b-2e3ca26b415d' },
  { code: 'DFD',    title: 'Teacher Leader',                                                 section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bdbc13e2-4573-4a0f-8c1d-c5d57452a24d' },
  { code: 'DG',     title: 'Certified Employee Evaluation',                                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b814d009-3f15-49e0-a1b9-b9b0c72b5cde' },
  { code: 'DG-E1',  title: 'Certified Employee Evaluation (Exhibit 1)',                      section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c8dd4a56-54a9-4bf4-81e1-ee37f42f9372' },
  { code: 'DGA',    title: 'Classified Employee Evaluation',                                 section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ceb6c4da-7b0c-407a-961f-7e492a9f000d' },
  { code: 'DGD',    title: 'Liability: Volunteers',                                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=9c8ad6d1-90d7-49b1-b8c3-2f5664aa3ad2' },
  { code: 'DHA',    title: 'Orderly School Termination for Employees',                       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=81a6c14d-ad3d-437b-85f8-0a5878c3bb08' },
  { code: 'DHB',    title: 'Reduction in Force',                                             section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2a66e816-602f-4131-942c-d27f27a37d3c' },
  { code: 'DHC',    title: 'Redress of Grievances',                                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=87ebc85d-60e4-4388-9450-23982e7b8ab0' },
  { code: 'DHCD',   title: 'Credit for Prior Teaching',                                      section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=fd904c12-cefb-4ce7-8122-b68f2c34cf27' },
  { code: 'DHD',    title: 'Employment Relations: Employee Associations and Wage Deductions', section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f045d2dc-683f-47ce-985f-af0bed743c6b' },
  { code: 'DHDA',   title: 'Employment Relations: Employee Associations and Leave',          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=604f6062-c594-4278-b7d7-781aec446c2e' },
  { code: 'DHDB',   title: 'Employee Leave Policy',                                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=459c325c-726b-4160-8783-7201911424f2' },
  { code: 'DI',     title: 'Legal Defense of Employees',                                     section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d9fd9358-a011-47c1-9723-ed80e7d772c1' },
  { code: 'DJ',     title: 'Employee References and Letters of Recommendation',              section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=95d05534-37b0-4798-948d-2d1d777c9278' },
  { code: 'DKAA',   title: 'Hiring Procedures and Protocols',                                section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a390ffea-b455-4dff-9326-a5887f3370e7' },
  { code: 'DKAA-A', title: 'Non-Benefited Hiring Process',                                   section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=64e6ead6-db74-4085-9e47-934b6a8283e2' },
  { code: 'DKAA-B', title: 'At-Will Stipends',                                               section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=8504c8cf-e179-4d40-9ca3-ab05954a61bd' },
  { code: 'DKAB',   title: 'Hiring Preference of Veterans and Veterans\' Spouses',           section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e37506fb-ebc6-419e-8fa9-20ccf5be7768' },
  { code: 'DKAC',   title: 'Nepotism',                                                       section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=64b560ca-73bb-4564-9a6c-db52b4d9bf53' },
  { code: 'DKB',    title: 'Sexual Harassment',                                              section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d82fc06e-773f-4264-a5bc-0883dc221755' },
  { code: 'DKB-E1', title: 'Sexual Harassment (Exhibit 1)',                                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e83b030d-1df9-43e3-80ef-a8883930339c' },
  { code: 'DKBA',   title: 'District Employee and Student Relations',                        section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a8e4b7a0-f075-4500-9707-1cfc7cc37f24' },
  { code: 'DKC',    title: 'Family Medical Leave Policy',                                    section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=28a41600-f8b1-4a45-9dec-3091693e19eb' },
  { code: 'DKC-E1', title: 'Family Medical Leave Policy (Exhibit 1)',                        section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=be07c633-cf14-4def-b375-bf3496dbe4a5' },
  { code: 'DKC-E2', title: 'Family Medical Leave Policy (Exhibit 2)',                        section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b780fb8f-961b-4fd5-9243-3a0623324720' },
  { code: 'DKD',    title: 'Nursing Mothers in the Workplace',                               section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b5e85b21-0ca6-4cdb-a771-2fda7a0f52ff' },
  { code: 'DKE',    title: 'Postpartum and Parental Leave',                                  section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3aaeb255-3a2a-4048-a954-728b5af9b6c0' },
  { code: 'DKF',    title: 'Military Leave',                                                 section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=48351ee7-f6d1-4248-b76a-49abb1fc8f57' },
  { code: 'DLA',    title: 'Employee Bullying and Hazing',                                   section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=fba85def-4e6b-4a6b-bb55-701e59487ed1' },
  { code: 'DLB',    title: 'Grievances Regarding Abusive Conduct',                          section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=510059eb-3f64-4962-8d5a-32d7d0ff72f8' },
  { code: 'DMA',    title: 'Employee Acceptable Use of Personally Owned Electronic Devices', section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5c239109-a511-48e7-9ec5-6621e15c556f' },
  { code: 'DMB',    title: 'Employee Acceptable Use of District Electronic Devices',         section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3ab8cd81-cc1c-417a-bc86-284dc6a298c9' },
  { code: 'DMBA',   title: 'Employee Work Information Privacy',                              section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=aec613ea-5ebd-4683-92a4-14179f65ea2d' },
  { code: 'DMC',    title: 'Use of District Email for Political Purposes',                   section: 'Personnel', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e4d16179-4d70-4fd7-9cce-afd6d4fd6262' },

  // ── Section E — Instruction ───────────────────────────────────────────────
  { code: 'EAA',    title: 'Instructional Goals, Objectives, and Evaluation: Adoption and Purpose', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0f4b1679-276d-46a0-be5a-a417afed06f0' },
  { code: 'EBA',    title: 'Term of Instruction: School Year',                               section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2aca7967-697c-42d5-bbe1-8da6531ddd13' },
  { code: 'EBB',    title: 'Term of Instruction: School Day',                                section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=38105132-5e56-4b53-830a-102e1bb142b3' },
  { code: 'EBC',    title: 'Term of Instruction: Summer School',                             section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f77a1e0a-2042-48f0-a72b-473ba8621193' },
  { code: 'ECA',    title: 'Curriculum: Required Instruction',                               section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=9b5d682a-68ca-41e3-916c-bd092a09f680' },
  { code: 'ECBA',   title: 'Curriculum: Elective Instruction — Pass/Fail Courses',           section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=22d8f3a1-caff-404e-8ee0-a2b883e089d2' },
  { code: 'ECBB',   title: 'Curriculum: Elective Instruction — Driver Education',            section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a0d360d0-71fa-46bf-bd3f-fed85bb5719b' },
  { code: 'ECC',    title: 'Curriculum: Early Learning Plan',                                section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=187fca22-8391-4e3e-8c27-dae62d36f828' },
  { code: 'ECCA',   title: 'Curriculum: Reading Assessment for K-3',                         section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3fbc6a68-a60b-4cc7-b170-b693ea960440' },
  { code: 'ECCB',   title: 'Curriculum: Mathematics Assessment for K-3',                     section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3d783b60-9974-4630-88bc-c277a4962894' },
  { code: 'ECD',    title: 'Curriculum: American Sign Language',                             section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b8c23247-296f-4ba6-a199-7719ac384954' },
  { code: 'ECE',    title: 'Curriculum: College Course Work',                                section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5f85f93b-0410-43ad-aa2a-06b2cddaa1ed' },
  { code: 'ECF',    title: 'Curriculum: Religious Neutrality',                               section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=be367384-4945-4e82-a2b5-58a638e94c0c' },
  { code: 'ECG',    title: 'Curriculum: American Heritage',                                  section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=cd42f473-b700-4b44-83f7-81febd69320f' },
  { code: 'ECH',    title: 'Curriculum: Human Sexuality / Sex Education',                    section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d65369f4-1bd1-41fa-8d79-142b91fce782' },
  { code: 'ECI',    title: 'Curriculum: Cardiopulmonary Resuscitation',                      section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6bd9c917-e3b1-4d93-8b1d-ae3fd9abee8b' },
  { code: 'ECJ',    title: 'Curriculum: Ethnic Studies',                                     section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ed3eb34f-a894-4534-8942-e5afc564e7ca' },
  { code: 'ECK',    title: 'Curriculum: Honors Courses',                                     section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6c9ecaaa-79e7-42d0-9f11-6c0fcd3f46da' },
  { code: 'ECL',    title: 'Curriculum: Firearm Safety',                                     section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e4b51f93-c2d9-41ad-afc4-f75ac3202894' },
  { code: 'EDA',    title: 'Special Programs: Alternative Language Program',                 section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=be75832f-fd58-4fa1-a1e4-a487b52f0889' },
  { code: 'EDB',    title: 'Special Programs: Dropout Prevention and Recovery',              section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6ca6bb7a-eeb4-4c09-a109-6ad6900fa5f5' },
  { code: 'EDC',    title: 'Special Programs: Education of Youth in Care',                   section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6fc0e10d-40a3-498b-a982-e0daeaa936b9' },
  { code: 'EDD',    title: 'Special Programs: Gifted and Talented Students',                 section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=248b4a38-87d1-4eee-9772-0c5070f88629' },
  { code: 'EDE',    title: 'Special Programs: Special Education',                            section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=aa7559c6-2c2e-49a7-8032-3d4965be4d71' },
  { code: 'EDF',    title: 'Special Programs: Health Care Occupation Programs',              section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=474fa8d7-f565-4256-8045-41037113f06a' },
  { code: 'EDG',    title: 'Special Programs: Higher Education Savings Options',             section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=17ccac90-b40c-47d8-995b-04a1c6a297f5' },
  { code: 'EDH',    title: 'Special Programs: Student Internships',                          section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=419f7be8-71e3-49ae-9b47-35d70572917d' },
  { code: 'EEA',    title: 'Instructional Resources: Copyrighted Material',                 section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b785a366-9d6f-42a3-981d-d0a9f5041179' },
  { code: 'EEB',    title: 'Instructional Resources: Internet Policy',                       section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=65b0fb77-c9fb-4a72-b99d-7caf57f6e256' },
  { code: 'EEC',    title: 'Instructional Resources: Purchase of Primary Instructional Materials', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=699e136b-0497-4459-9bb3-1d439108184a' },
  { code: 'EED',    title: 'Instructional Resources: Teaching Supplies and Materials',       section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e03418ac-826a-43ed-84e0-6f6049b79926' },
  { code: 'EEE',    title: 'Instructional Resources: Evaluation and Selection of Instructional Material', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1a5166a0-1ecd-4fce-9d0e-3dcaf81ecc24' },
  { code: 'EEEA',   title: 'Instructional Resources: Evaluation and Selection of Library Material', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4e681d3f-896e-4022-864a-c2acb8127ab0' },
  { code: 'EEEB',   title: 'Instructional Resources: Evaluation and Selection of Supplemental Material', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3967abdd-188c-4f37-9059-156dea418fd9' },
  { code: 'EEEC',   title: 'Instructional Resources: Evaluation of Other Learning Material', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ea0ae04b-a6b8-4a5c-b7ee-294afffe39e6' },
  { code: 'EFA',    title: 'Grading: Progress Reports to Parents',                           section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a32312bf-f43e-4888-9d27-f832749fdb6b' },
  { code: 'EFB',    title: 'Grading: Testing Procedures and Standards',                      section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=76c891c3-f405-424f-9cc9-159c45890fa7' },
  { code: 'EFBA',   title: 'Kindergarten Assessment Policy',                                 section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6cdc033a-2b75-4d8d-93b8-27d921f6d376' },
  { code: 'EFBB',   title: 'Grading: Testing Procedures and Standards — Exclusion from Testing', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c44d08f0-2043-4927-8454-f66830fb8113' },
  { code: 'EFC',    title: 'Grading: Participation of Home School, Scholarship, and Private School Students in Statewide Assessments', section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=20e4e18d-0869-4cd2-b354-f951da87cc18' },
  { code: 'EFD',    title: 'Grading: Course Grade Replacement',                              section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=edfcbb21-77cd-4f58-8a53-6f5d4cc19244' },
  { code: 'EHA',    title: 'Graduation: Graduation Requirements',                            section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ee1cbed9-04b9-4457-85bf-857411e3b75b' },
  { code: 'EHA-L',  title: 'Graduation Requirements (Local)',                                section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b4a4e54f-0d2b-4116-9fe7-15903c79d2c1' },
  { code: 'EHAA',   title: 'Graduation: Graduation Attire',                                  section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=49fe8124-b966-491c-b27c-851f0d80c41a' },
  { code: 'EHB',    title: 'Graduation: Citizenship Graduation Requirements',                section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=9535fc85-db38-44e6-863c-99ed59091fca' },
  { code: 'EHC',    title: 'Graduation: Focused Graduation Pathway',                         section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=19b82a75-7ae8-41fc-af62-a1102374bfd1' },
  { code: 'EHD',    title: 'Graduation: Middle School Graduation Requirements',              section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=287bb25b-bc78-4cb2-acaa-eb0099e686c4' },
  { code: 'EHE',    title: 'Graduation: Adult Education Graduation',                         section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d2b3351d-09a3-4960-bc80-e7f4f28ff848' },
  { code: 'EIA',    title: 'Sensitive Materials in Schools',                                 section: 'Instruction', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=51b89269-0e14-4760-81e7-2ebaf1f0ab98' },

  // ── Section F — Students ──────────────────────────────────────────────────
  { code: 'FA',     title: 'Equal Educational Opportunities',                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=abfd8760-4146-4c47-bb75-d47eee52f014' },
  { code: 'FAA',    title: 'Evaluation of Interscholastic Athletic Participation',           section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b27fdc75-94a5-4c07-bc4f-6c9c70a1aa75' },
  { code: 'FAB',    title: 'Transgender Students',                                           section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5da21966-bc17-4176-a8cc-c60a09b68963' },
  { code: 'FABA',   title: 'Participation in Sex-Designated Athletic Activities and Teams',  section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bb0efaa1-211b-4855-9243-ff3db2c0b383' },
  { code: 'FABB',   title: 'Use of Sex-Designated Facilities',                               section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b63d2c85-bf6d-4e30-9f43-d4891edb9842' },
  { code: 'FAC',    title: 'Services for Homeless Students',                                 section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=983a374f-278a-42f3-a79e-d7a02cdf84c3' },
  { code: 'FAD',    title: 'Student Notifications',                                          section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=43c5aae6-09c6-44c1-bb47-f234b6abcba0' },
  { code: 'FBA',    title: 'Admissions and Attendance: Eligibility and Admissions Requirements', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4b3c3e3a-cfdd-4dab-b450-3ddf0c64e191' },
  { code: 'FBAA',   title: 'Admissions and Attendance: Foreign Exchange Students',           section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ba4de05c-3ce9-427e-95f8-89cf9e5a8ec0' },
  { code: 'FBAB',   title: 'Admissions and Attendance: Military and DOD Civilian Children', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5481a20d-5ba3-4955-bf84-f5bc900f8da7' },
  { code: 'FBAC',   title: 'Admissions and Attendance: Kindergarten',                        section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=61dbe85f-54b1-467d-a770-3e233181c391' },
  { code: 'FBB',    title: 'Admissions and Attendance: Compulsory Education',                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=26db28f4-2c2c-458c-b1a4-b11e596971b2' },
  { code: 'FBB-10', title: 'Ten-Day Withdrawal Rule',                                        section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1a1cf41f-bd45-4de8-9c42-f60cc827727b' },
  { code: 'FBBA',   title: 'Dual Enrollment',                                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e2b2025a-d623-4673-965a-5a3839c5ffa2' },
  { code: 'FBBB',   title: 'Participation in Online Education',                              section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=095679a5-3bc8-4ec0-92fb-a2f382bc30d1' },
  { code: 'FBBC',   title: 'Home-Centered School Enrollment',                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6548bd39-a5db-48cf-a772-4dc48eeb1f53' },
  { code: 'FBC',    title: 'Coordinating Services for School-Age Youth',                     section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=7a86b675-9edc-46ed-bd01-7598ec88f25a' },
  { code: 'FBE',    title: 'Admissions and Attendance: Truancy Support Centers',             section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=cab94b8c-2aef-4ef4-a93c-c7e6de18401a' },
  { code: 'FBF',    title: 'Re-Entry into Public Schools',                                   section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6126bd60-c012-41eb-b0b5-8b1c7d2d8b36' },
  { code: 'FDA',    title: 'Health Requirements and Services: Vision Screening',             section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c582a79f-36db-4ea6-8367-34e1c1589eb7' },
  { code: 'FDAB',   title: 'Health Requirements and Services: Immunizations',                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=24515e77-8db1-4815-8d19-ccfd41b39f82' },
  { code: 'FDAC',   title: 'Health Requirements and Services: Medical Treatment',            section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c08fe492-36cd-47e4-815f-0cc8f11ecd6e' },
  { code: 'FDACA',  title: 'Medical Treatment Directives',                                   section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3ecd03ab-0b05-4dd8-a196-9cad24102eb5' },
  { code: 'FDACB',  title: 'Health Requirements and Services: Student Treatment for Diabetes', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f4c7c96f-69b1-4954-ac7e-80b142212f9a' },
  { code: 'FDACC',  title: 'Health Requirements and Services: Students with Potentially Life-Threatening Allergies', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=373d7ab5-8f26-423c-a4b1-1a879ecc9cad' },
  { code: 'FDACD',  title: 'Health Requirements and Services: Student Asthma Emergency',    section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=26d21e88-60f9-4054-9dc8-542c9dd06346' },
  { code: 'FDACE',  title: 'Health Requirements and Services: Medical Recommendations by School Personnel to Parents', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=7fe1cfc2-c47e-489e-b3a9-11cabf2ad487' },
  { code: 'FDACF',  title: 'Health Requirements and Services: Student Self-Application of Sunscreen', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=538cc03a-0126-4561-814d-754734a019c1' },
  { code: 'FDACG',  title: 'Health Requirements and Services: Mental Health Care',           section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c8b7db54-87f0-4626-b7d3-139ee4181aab' },
  { code: 'FDAD',   title: 'Health Requirements and Services: Communicable Diseases',        section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f9130dd2-5ec7-4493-b223-eaefa8fe9a1b' },
  { code: 'FDAE',   title: 'Students Infected with AIDS, HIV, or ARC',                      section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=615fa9ca-eee3-4c36-9184-192e63fc5598' },
  { code: 'FDAF',   title: 'Concussion and Head Injuries',                                   section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=8e38bc60-0f90-4fce-a3fc-e9672631f800' },
  { code: 'FDB',    title: 'Youth Suicide Prevention',                                       section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=30f5972c-c0fe-42be-976b-1ad653b29674' },
  { code: 'FDC',    title: 'School Breakfast Program',                                       section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c803a0ea-d80b-4ae0-a56e-8b29ae6ce293' },
  { code: 'FDD',    title: 'School Meal Payments',                                           section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a66dd5f6-2d0d-4821-8be1-6f245a04f665' },
  { code: 'FDE',    title: 'Wellness Policy Adoption Process',                               section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=38416ba8-608c-46d7-9f1c-a1169f905fe7' },
  { code: 'FDEA',   title: 'Wellness Policy: Food Sales',                                    section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=76a716f2-7f18-4b53-877f-d8822c9fd5ed' },
  { code: 'FDF',    title: 'Positive Behaviors Plan',                                        section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4cab9b96-4c19-4ae6-b143-4c4c94445772' },
  { code: 'FDG',    title: 'Period Products in Schools',                                     section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=8e061bad-67d5-4514-9773-803c4c699b5a' },
  { code: 'FDH',    title: 'Student Toilet Training',                                        section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=67eeb7d0-3e2f-416a-9506-e9d5825dffa8' },
  { code: 'FE',     title: 'Student Records',                                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=837f5385-bef5-4ecb-92bf-03ac1283f23d' },
  { code: 'FEA',    title: 'Education and Family Privacy',                                   section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4fa0c082-618e-41e0-a005-7cdb05dfb851' },
  { code: 'FEC',    title: 'Non-Custodial Parent\'s Access to Child\'s Education Records',  section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1921d7ee-995e-4811-81bc-3a00e0e2e3da' },
  { code: 'FED',    title: 'Student Data Protection',                                        section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1bbc9533-cba0-4a28-8e9f-8cd62784abdc' },
  { code: 'FF',     title: 'Student Activities',                                             section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4a7e7f13-53a0-41b6-b75f-ea374717c847' },
  { code: 'FFA',    title: 'Student Activities: Publications and Prior Review',              section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4e8ba3f3-4fa9-4290-905b-5bba3231e71e' },
  { code: 'FFB',    title: 'Student Activities: Organizations and Clubs: Secret Societies',  section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2ae7e187-fc92-42a4-89db-276c851e9dfc' },
  { code: 'FFC',    title: 'Student Travel Policy',                                          section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ba86a0c4-2674-4f91-bd8f-8fc98b75696b' },
  { code: 'FFD',    title: 'Student Activities: Non-Enrolled District Students\' Participation in Extracurricular Activities', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=8b50b94d-77e9-4f0d-9a8c-813e8be28709' },
  { code: 'FG',     title: 'Curriculum and Non-Curriculum Student Groups',                   section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=850cdf2a-831d-44d6-b682-e5f76645d1de' },
  { code: 'FGAA',   title: 'Student Conduct: Demonstrations',                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0997f496-3822-46e8-bf9d-9a78fa8ceb33' },
  { code: 'FGAB',   title: 'Student Conduct Policy: Electronic Devices',                     section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=20e165a2-24f5-4268-9510-57a0354dfa14' },
  { code: 'FGAC',   title: 'Bus Conduct',                                                    section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6fdfe56a-e423-4e75-bcd8-73d12765a121' },
  { code: 'FGAD',   title: 'Student Rights and Responsibilities: Bullying, Cyberbullying, Hazing, and Abusive Conduct', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f9d33756-4318-47d0-ad53-1effaf5d6ccd' },
  { code: 'FGB',    title: 'Student Rights and Responsibilities: Married Students',          section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2d59b369-04f8-49f7-90ab-6649079cc61c' },
  { code: 'FGC',    title: 'Student Rights and Responsibilities: Pregnant Students',         section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4ef9118f-679a-43d0-8a4c-68c623528ac6' },
  { code: 'FGD',    title: 'Student Rights and Responsibilities: Interrogations and Searches', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a441c4e9-4d81-4273-8d3d-a78757a439c1' },
  { code: 'FGE',    title: 'Student Rights and Responsibilities: Student Complaints',        section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ca5a465a-d41b-4c6f-b07a-bfb7d7711e5d' },
  { code: 'FGF',    title: 'Student Rights and Responsibilities: Student Privacy and Modesty', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=01eb3905-8cb0-4280-92ff-b99d80f20822' },
  { code: 'FH',     title: 'Student Discipline',                                             section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ac3c3f77-c1c6-4005-bb73-cb1070d290d5' },
  { code: 'FHA',    title: 'Safe Schools',                                                   section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=fa995ea5-fd97-470e-bd8c-e01d7a219709' },
  { code: 'FHAA',   title: 'Safe Schools: Alcohol and Drugs',                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2227c7ac-3379-4355-b99d-c6b990ef2356' },
  { code: 'FHAB',   title: 'Safe Schools: Sexual Harassment',                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2b131bfe-24ff-41b0-b1c0-9b68eee2f230' },
  { code: 'FHAD',   title: 'Safe Schools: Discipline of Students With Disabilities',         section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=b9da7364-1c37-42ae-bc28-c1767a2f2cfc' },
  { code: 'FHAE',   title: 'Safe Schools: Disruptive Student Behavior',                      section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c5a6d6bf-8354-46e3-8bb9-e6f11a09d52d' },
  { code: 'FHAF',   title: 'Safe Schools: Emergency Safety Interventions',                   section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c8d28560-ab61-48c4-a850-e0df56cf98ee' },
  { code: 'FHAG',   title: 'Safe Schools: Tobacco and Electronic Cigarettes',                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4bb536fb-2431-4595-a73b-a73477021073' },
  { code: 'FHB',    title: 'Student Courts',                                                 section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4f6f3568-11d6-4b63-b61b-34f5fd534d34' },
  { code: 'FHC',    title: 'Notification Received from Juvenile Courts',                     section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=5df16215-51a6-4932-9afc-00bd73f1b07c' },
  { code: 'FHD',    title: 'Relations with Governmental Agencies and Local Governmental Authorities', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=148130a0-0f78-4e3b-88f1-0676c93a81e8' },
  { code: 'FI',     title: 'Student Fees, Fines, and Charges',                               section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=ab9bf775-74fa-475f-9345-8c2a771c3361' },
  { code: 'FJ',     title: 'Visitation on Campus: Students Leaving with Adult During School Hours', section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=720c25df-8de8-467a-900e-6fdcc29ceb82' },
  { code: 'FK',     title: 'School Uniforms',                                                section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=6d638429-a988-4df6-ba28-79dca5b3ccf0' },
  { code: 'FL',     title: 'Athletic Uniforms',                                              section: 'Students', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2d0eabd1-bfab-448b-9fcd-fc99091a74d8' },

  // ── Section G — Community Relations ──────────────────────────────────────
  { code: 'GA',     title: 'Public Information Program: Public Records',                     section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=2010144c-de41-4b96-a4f9-d722633609f6' },
  { code: 'GAA',    title: 'Government Data Privacy',                                        section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=577d59d1-2046-4a55-bd1b-2a3c4d0eb2d1' },
  { code: 'GB',     title: 'Public Complaints',                                              section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=69c73808-f98f-45e0-a5c0-fc97cd02887a' },
  { code: 'GBA',    title: 'Board of Education Hotline',                                     section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=9746f97e-3e92-4ce7-9efa-817885f1ac72' },
  { code: 'GC',     title: 'Community Use of School Facilities',                             section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0fc15895-a8ce-4ead-966c-90ea6aeef1c3' },
  { code: 'GC-R',   title: 'Request to Perform at District Property',                        section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=e69219ed-dbd5-4144-83f1-c64477a4d0df' },
  { code: 'GCA',    title: 'Conduct on School Premises',                                     section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=9f906fb1-324e-4458-a84b-15cb7ef38af3' },
  { code: 'GCB',    title: 'Community Support Groups',                                       section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=c612c96a-6206-48c7-9f16-9ba3bb251ce5' },
  { code: 'GCBA',   title: 'Parental Participation',                                         section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=953af7f4-0ed4-4daf-b4b7-f9abdd747a93' },
  { code: 'GCC',    title: 'Child Care',                                                     section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=43d50cd9-5e04-4fa7-bafb-a44db84e2cae' },
  { code: 'GCD',    title: 'Political Party Use of School Meeting Facilities',               section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bc4ff1f4-9c39-477a-aa3d-51c50e5f4a57' },
  { code: 'GCE',    title: 'Parent Rights to Academic Accommodations',                       section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a786c3a2-c091-4425-9915-654537c69013' },
  { code: 'GCF',    title: 'Animals on School Premises',                                     section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=a58fea2c-cecb-4741-93f6-c3c8be90b766' },
  { code: 'GCG',    title: 'School Climate Surveys',                                         section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=4659ec0c-ee8d-4118-a2ea-91f3e91e63c9' },
  { code: 'GD',     title: 'Parent Access to District Instructional Material',               section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d493e54b-25a7-41e7-a354-cf7d43df7c81' },
  { code: 'GDA',    title: 'Parent Access to Student Library Information',                   section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=1a5319c2-e78c-4673-8f32-dba25ed5b9f2' },
  { code: 'GE',     title: 'School Community Councils',                                      section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=bf8ef586-95e7-4d75-bd1d-b9461248b31f' },
  { code: 'GF',     title: 'Fund Raising and Donations',                                     section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0f2d6dc3-df68-4b48-abd9-5fde9149d373' },
  { code: 'GF-E1',  title: 'Fund Raising and Donations (Exhibit 1)',                         section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=d3afd5d4-9b5a-45ab-a354-4367142e7f57' },
  { code: 'GFA',    title: 'Private and Non-School-Sponsored Activities and Fundraising',    section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=69d4693c-b743-4760-8847-bd4a25eafafa' },
  { code: 'GH',     title: 'Honorary Diplomas for Veterans',                                 section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=0b16c645-ac01-4dca-af36-6f1578af9647' },
  { code: 'GI',     title: 'Military Testing and Recruitment',                               section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=08ad3324-62be-4fb3-af19-0725c44b6c29' },
  { code: 'GJ',     title: 'Child Sexual Abuse and Human Trafficking Prevention Education',  section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=f17c6631-dba7-48ec-a28c-7504615e55ed' },
  { code: 'GK',     title: 'Educational Authority of Separated Parents',                     section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=748fb0fd-01df-48db-b844-da6be56a59c7' },
  { code: 'GL',     title: 'Released Time Classes',                                          section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=7a7e39bb-51c4-4495-b62e-666a9e4bc6db' },
  { code: 'GM',     title: 'Flags on School Property',                                       section: 'Community Relations', url: 'https://meetings.boardbook.org/Documents/FileViewerOrPublic/3241?file=3f2adc4f-d8df-476d-a68c-ad85766b7f50' },
];

async function fetchPolicyText(policy) {
  const pdfUrl = downloadUrl(policy.url);
  try {
    const res = await fetch(pdfUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GCSD-Policy-Seeder/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (err) {
    return null;
  }
}

function firstSentence(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const end = clean.search(/[.!?]\s/);
  if (end > 0 && end < 300) return clean.substring(0, end + 1);
  return clean.substring(0, Math.min(200, clean.length));
}

const results = [];
const failed = [];

console.log(`Downloading ${POLICIES.length} policies…\n`);

for (let i = 0; i < POLICIES.length; i++) {
  const p = POLICIES[i];
  process.stdout.write(`[${String(i + 1).padStart(3)}/${POLICIES.length}] ${p.code.padEnd(10)} ${p.title.substring(0, 50).padEnd(50)} `);

  const text = await fetchPolicyText(p);

  if (text && text.length > 50) {
    process.stdout.write('✓\n');
    results.push({
      id: makeId(p.code),
      title: `${p.code} — ${p.title}`,
      category: p.section,
      summary: firstSentence(text),
      content: text,
    });
  } else {
    process.stdout.write('✗ (skipped)\n');
    failed.push(p.code);
    results.push({
      id: makeId(p.code),
      title: `${p.code} — ${p.title}`,
      category: p.section,
      summary: `${p.code}: ${p.title}`,
      content: `Policy ${p.code}: ${p.title}\n\nFull text not available. Please refer to the official GCSD policy document at the BoardBook portal.`,
    });
  }

  // Polite delay
  await new Promise(r => setTimeout(r, 200));
}

fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));

console.log(`\n✓ Wrote ${results.length} policies to server/policySeed.json`);
if (failed.length) console.log(`⚠ Failed to fetch: ${failed.join(', ')}`);
