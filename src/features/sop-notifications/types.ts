export type SopNotificationStatus = 'pending' | 'approved' | 'rejected' | 'resolved';

export interface SopRuleChange {
  id: string;
  ruleId: string;
  title: string;
  changeType: 'modified' | 'added' | 'removed';
  previous: {
    condition: string;
    action: string;
  };
  current: {
    condition: string;
    action: string;
  };
  dependentNodes: string[];
}

export interface SopChangeNotification {
  id: string;
  workflowId: string;
  workflowName: string;
  sopTitle: string;
  fromVersion: number;
  toVersion: number;
  detectedAt: string;
  source: 'uploaded_file' | 'monitored_link';
  status: SopNotificationStatus;
  unread: boolean;
  changes: SopRuleChange[];
}
