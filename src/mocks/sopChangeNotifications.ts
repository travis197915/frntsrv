import type { SopChangeNotification } from '@/features/sop-notifications/types';

export const MOCK_SOP_CHANGE_NOTIFICATIONS: SopChangeNotification[] = [
  {
    id: 'sop-revision-timely-filing-v5',
    workflowId: '7c476f09-5196-438f-b25e-9cc3c96eac97',
    workflowName: 'OBH CLAIM AUDIT FLOW',
    sopTitle: 'OBH Facets Timely Filing',
    fromVersion: 1,
    toVersion: 2,
    detectedAt: '2026-08-04T08:45:00.000Z',
    source: 'monitored_link',
    status: 'pending',
    unread: true,
    changes: [
      {
        id: 'change-tf-step-05',
        ruleId: 'TF-STEP-05',
        title: 'New day claim submission limit',
        changeType: 'modified',
        previous: {
          condition:
            'IF the submission is a new day claim from an in-network provider.',
          action:
            'THEN apply a 120-day timely filing limit from date of service.',
        },
        current: {
          condition:
            'IF the submission is a new day claim from an in-network provider.',
          action:
            'THEN apply 90 days from date of service. Exception: IHC out-of-network claims receive 365 days from date of service or discharge.',
        },
        dependentNodes: [
          'Step 6 · Verify proof of timely filing',
          'Step 15 · Process claim',
        ],
      },
      {
        id: 'change-tf-cob-2024',
        ruleId: 'TF-COB-2024',
        title: 'COB submission filing window',
        changeType: 'modified',
        previous: {
          condition:
            'IF the claim is a COB submission from an in-network or out-of-network provider.',
          action:
            'THEN allow 365 days from date of service or 90 days from the other carrier paid date.',
        },
        current: {
          condition:
            'IF the claim is a COB submission processed on or after January 1, 2024.',
          action:
            'THEN apply 90 days from the Other Carriers Paid Date. If the COB paid date is blank, use the current claim received date.',
        },
        dependentNodes: [
          'Step 6 · Verify proof of timely filing',
          'Step 9 · Validate EOB receipt window',
          'Step 15 · Process claim',
        ],
      },
      {
        id: 'change-tf-step-13',
        ruleId: 'TF-STEP-13',
        title: 'Resubmitted claim override',
        changeType: 'modified',
        previous: {
          condition:
            'IF the new claim was resubmitted within the timely filing limit.',
          action:
            'THEN bypass timely filing and continue processing.',
        },
        current: {
          condition:
            'IF the new claim was resubmitted within the timely filing limit and the frequency code is 7 or 8.',
          action:
            'THEN apply Bypass Claim Accept Months using exception code OCA and continue to OBH Facets Claim Attachment Validation.',
        },
        dependentNodes: [
          'OBH Facets Claim Attachment Validation',
          'Step 14 · Review original claim',
          'Step 15 · Process claim',
        ],
      },
    ],
  },
];
