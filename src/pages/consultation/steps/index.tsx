import StartPage from './StartPage';
import FirstVisitPage from './FirstVisitPage';
import IntentPage from './IntentPage';
import PhotoPage from './PhotoPage';
import StylePage from './StylePage';
import GenerationPage from './GenerationPage';
import FeedbackPage from './FeedbackPage';
import FinalizePage from './FinalizePage';
import ReportPage from './ReportPage';

export const consultationRoutes = [
  { path:'start', element:<StartPage/> },
  { path:'first-visit', element:<FirstVisitPage/> },
  { path:'intent', element:<IntentPage/> },
  { path:'photo', element:<PhotoPage/> },
  { path:'style', element:<StylePage/> },
  { path:'generation', element:<GenerationPage/> },
  { path:'feedback', element:<FeedbackPage/> },
  { path:'finalize', element:<FinalizePage/> },
  { path:'report', element:<ReportPage/> },
];
