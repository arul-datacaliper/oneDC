import { Routes } from '@angular/router';

import { TimesheetsComponent } from './timesheets.component';
import { TimesheetEditorComponent } from './timesheet-editor/timesheet-editor.component';

export const TIMESHEETS_ROUTES: Routes = [
  { path: '', component: TimesheetEditorComponent },
  { path: 'list', component: TimesheetsComponent }
];
