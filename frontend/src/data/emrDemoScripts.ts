// frontend/src/data/emrDemoScripts.ts

export interface EMRField {
    label: string;
    value: string | string[];
    badge?: string;
    badgeColor?: "red" | "amber" | "green" | "blue" | "purple";
  }
  
  export interface EMROutput {
    patientName: string;
    dob: string;
    mrn: string;
    visitDate: string;
    provider: string;
    chiefComplaint: string;
    sections: {
      title: string;
      icon: string;
      fields: EMRField[];
    }[];
    icd10: { code: string; description: string }[];
    cpt: { code: string; description: string }[];
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    riskScore: number;
  }
  
  export interface DemoScript {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    dictation: string; // Full text that gets "typed" character by character
    emr: EMROutput;
  }
  
  export const DEMO_SCRIPTS: DemoScript[] = [
    {
      id: "chest-pain",
      title: "Chest Pain – Urgent",
      subtitle: "55yr Male · Acute Presentation",
      icon: "💔",
      color: "red",
      dictation:
        "Patient is a 55-year-old male presenting with acute crushing chest pain, rated 8 out of 10, radiating to the left arm and jaw. Patient reports associated diaphoresis and nausea. Symptoms began approximately 45 minutes ago. Past medical history significant for hypertension, currently on Lisinopril 10 milligrams daily. No known drug allergies. Vitals: BP 158 over 96, HR 102, RR 20, SpO2 94% on room air. EKG shows ST elevation in leads V1 through V4. Impression: STEMI. Plan: Activate cath lab immediately, initiate dual antiplatelet therapy, start heparin drip, cardiology consult stat.",
      emr: {
        patientName: "Ahmed Raza",
        dob: "12 Mar 1969",
        mrn: "TC-004821",
        visitDate: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
        provider: "Dr. Fatima Malik",
        chiefComplaint: "Acute crushing chest pain 8/10, radiating to left arm & jaw",
        riskLevel: "CRITICAL",
        riskScore: 94,
        sections: [
          {
            title: "Subjective",
            icon: "🗣️",
            fields: [
              { label: "Chief Complaint", value: "Acute crushing chest pain, 8/10 severity" },
              { label: "Radiation", value: "Left arm and jaw" },
              { label: "Associated Symptoms", value: ["Diaphoresis", "Nausea"] },
              { label: "Onset", value: "45 minutes ago" },
              { label: "PMH", value: "Hypertension" },
              { label: "Medications", value: "Lisinopril 10mg daily" },
              { label: "Allergies", value: "NKDA" },
            ],
          },
          {
            title: "Objective",
            icon: "📊",
            fields: [
              { label: "Blood Pressure", value: "158/96 mmHg", badge: "HIGH", badgeColor: "red" },
              { label: "Heart Rate", value: "102 bpm", badge: "ELEVATED", badgeColor: "amber" },
              { label: "Respiratory Rate", value: "20 /min" },
              { label: "SpO2", value: "94% (Room Air)", badge: "LOW", badgeColor: "red" },
              { label: "EKG Findings", value: "ST elevation leads V1–V4", badge: "CRITICAL", badgeColor: "red" },
            ],
          },
          {
            title: "Assessment",
            icon: "🔍",
            fields: [
              { label: "Primary Diagnosis", value: "STEMI — ST-Elevation Myocardial Infarction", badge: "CRITICAL", badgeColor: "red" },
              { label: "Confidence", value: "97%" },
            ],
          },
          {
            title: "Plan",
            icon: "📋",
            fields: [
              { label: "Immediate Actions", value: ["Activate cath lab STAT", "Dual antiplatelet therapy (Aspirin + Clopidogrel)", "Heparin drip initiation", "Cardiology consult STAT", "Supplemental O₂ 4L/min"] },
            ],
          },
        ],
        icd10: [
          { code: "I21.09", description: "STEMI involving other coronary artery of anterior wall" },
          { code: "I10", description: "Essential (primary) hypertension" },
        ],
        cpt: [
          { code: "99285", description: "Emergency dept visit, high complexity" },
          { code: "93010", description: "Electrocardiogram, interpretation & report" },
          { code: "92941", description: "Percutaneous cardiac intervention (planned)" },
        ],
      },
    },
    {
      id: "diabetes-followup",
      title: "Diabetes Follow-up",
      subtitle: "58yr Male · Type 2 DM",
      icon: "🩸",
      color: "amber",
      dictation:
        "Patient is a 58-year-old male here for diabetes follow-up. Known Type 2 Diabetes Mellitus, diagnosed 6 years ago. Chief complaints today: fatigue, increased thirst, and blurred vision for 2 weeks. Current medications: Metformin 1000 milligrams twice daily. Lab results: HbA1c 9.2%, fasting blood glucose 214 milligrams per deciliter, creatinine 1.1, eGFR 72, LDL 138. Vitals: BP 132 over 82, BMI 31.4, weight 88 kilograms. Eyes: bilateral mild non-proliferative diabetic retinopathy noted on funduscopy. Assessment: Type 2 DM, poorly controlled. Plan: Add Sitagliptin 100 milligrams daily. Refer to ophthalmology and diabetic educator. Repeat HbA1c in 3 months. Dietary counseling for low glycemic index diet.",
      emr: {
        patientName: "Khalid Mehmood",
        dob: "07 Jun 1966",
        mrn: "TC-002193",
        visitDate: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
        provider: "Dr. Usman Tariq",
        chiefComplaint: "Fatigue, polydipsia, blurred vision × 2 weeks",
        riskLevel: "MEDIUM",
        riskScore: 62,
        sections: [
          {
            title: "Subjective",
            icon: "🗣️",
            fields: [
              { label: "Chief Complaint", value: "Fatigue, increased thirst, blurred vision × 2 weeks" },
              { label: "Known Conditions", value: "Type 2 DM (6 years)" },
              { label: "Current Medications", value: "Metformin 1000mg BD" },
              { label: "Allergies", value: "NKDA" },
            ],
          },
          {
            title: "Objective",
            icon: "📊",
            fields: [
              { label: "HbA1c", value: "9.2%", badge: "POOR CONTROL", badgeColor: "red" },
              { label: "Fasting Glucose", value: "214 mg/dL", badge: "HIGH", badgeColor: "amber" },
              { label: "Creatinine / eGFR", value: "1.1 / 72" },
              { label: "LDL Cholesterol", value: "138 mg/dL", badge: "ELEVATED", badgeColor: "amber" },
              { label: "BMI", value: "31.4 (Obese class I)" },
              { label: "Blood Pressure", value: "132/82 mmHg" },
              { label: "Funduscopy", value: "Bilateral mild NPDR", badge: "ABNORMAL", badgeColor: "amber" },
            ],
          },
          {
            title: "Assessment",
            icon: "🔍",
            fields: [
              { label: "Primary Diagnosis", value: "Type 2 DM, poorly controlled", badge: "MEDIUM RISK", badgeColor: "amber" },
              { label: "Complication", value: "Non-proliferative diabetic retinopathy (bilateral)" },
            ],
          },
          {
            title: "Plan",
            icon: "📋",
            fields: [
              { label: "Medications Added", value: "Sitagliptin 100mg OD" },
              { label: "Referrals", value: ["Ophthalmology (NPDR monitoring)", "Diabetic educator"] },
              { label: "Follow-up Labs", value: "HbA1c in 3 months" },
              { label: "Lifestyle", value: "Low glycemic diet counseling, weight reduction target 5kg" },
            ],
          },
        ],
        icd10: [
          { code: "E11.65", description: "Type 2 DM with hyperglycemia" },
          { code: "E11.329", description: "Type 2 DM with mild non-proliferative retinopathy" },
          { code: "E78.00", description: "Pure hypercholesterolemia, unspecified" },
        ],
        cpt: [
          { code: "99214", description: "Office visit, established patient, moderate complexity" },
          { code: "83036", description: "Hemoglobin A1C" },
          { code: "92250", description: "Fundus photography with interpretation" },
        ],
      },
    },
    {
      id: "fever-cough",
      title: "Fever + Cough",
      subtitle: "34yr Female · 3 Days",
      icon: "🌡️",
      color: "blue",
      dictation:
        "Patient is a 34-year-old female presenting with fever and dry cough for 3 days. Temperature 38.9 degrees Celsius. Associated fatigue and mild shortness of breath. No travel history, no sick contacts identified. No known drug allergies. On examination: throat mildly erythematous, lungs with scattered rhonchi bilaterally, no wheeze. SpO2 96% on room air. Chest X-ray: bilateral patchy infiltrates. COVID PCR ordered and pending. Assessment: Probable community-acquired pneumonia, COVID-19 to be ruled out. Plan: Amoxicillin-Clavulanate 875 milligrams twice daily for 7 days, supportive care, rest, adequate hydration. Return precautions given. Telemedicine follow-up in 48 hours.",
      emr: {
        patientName: "Sara Noor",
        dob: "15 Jan 1990",
        mrn: "TC-007734",
        visitDate: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
        provider: "Dr. Ayesha Siddiqui",
        chiefComplaint: "Fever 38.9°C + dry cough × 3 days, fatigue, mild dyspnea",
        riskLevel: "MEDIUM",
        riskScore: 48,
        sections: [
          {
            title: "Subjective",
            icon: "🗣️",
            fields: [
              { label: "Chief Complaint", value: "Fever + dry cough × 3 days" },
              { label: "Associated", value: ["Fatigue", "Mild shortness of breath"] },
              { label: "Epidemiology", value: "No travel history, no sick contacts" },
              { label: "Allergies", value: "NKDA" },
            ],
          },
          {
            title: "Objective",
            icon: "📊",
            fields: [
              { label: "Temperature", value: "38.9°C", badge: "FEBRILE", badgeColor: "red" },
              { label: "SpO2", value: "96% (Room Air)" },
              { label: "Throat", value: "Mildly erythematous" },
              { label: "Lungs", value: "Bilateral scattered rhonchi", badge: "ABNORMAL", badgeColor: "amber" },
              { label: "CXR", value: "Bilateral patchy infiltrates", badge: "ABNORMAL", badgeColor: "amber" },
              { label: "COVID PCR", value: "Pending", badge: "PENDING", badgeColor: "blue" },
            ],
          },
          {
            title: "Assessment",
            icon: "🔍",
            fields: [
              { label: "Primary Diagnosis", value: "Community-acquired pneumonia (probable)", badge: "MEDIUM RISK", badgeColor: "amber" },
              { label: "Differential", value: "COVID-19 pneumonia (to be excluded)" },
            ],
          },
          {
            title: "Plan",
            icon: "📋",
            fields: [
              { label: "Antibiotics", value: "Amoxicillin-Clavulanate 875mg BD × 7 days" },
              { label: "Supportive Care", value: ["Rest, oral hydration", "Paracetamol PRN fever"] },
              { label: "Follow-up", value: "Telemedicine in 48 hours" },
              { label: "Return Precautions", value: "SpO2 < 92%, increasing breathlessness → ER immediately" },
            ],
          },
        ],
        icd10: [
          { code: "J18.9", description: "Pneumonia, unspecified organism" },
          { code: "R50.9", description: "Fever, unspecified" },
          { code: "R05.9", description: "Cough, unspecified" },
        ],
        cpt: [
          { code: "99213", description: "Office visit, established patient, low-moderate complexity" },
          { code: "71046", description: "Radiologic exam, chest; 2 views" },
          { code: "87635", description: "COVID-19 infectious agent detection by PCR" },
        ],
      },
    },
  ];