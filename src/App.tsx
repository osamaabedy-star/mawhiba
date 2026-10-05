import React, { useState, useEffect } from 'react';
import { 
  UserRole, 
  Question, 
  Test, 
  Student, 
  ExamSubmission, 
  AppSettings, 
  CandidateStatus,
  GradeLevel
} from './types';
import { INITIAL_SETTINGS } from './data/initialData';
import { 
  loadDatabase, 
  saveDatabase, 
  resetDatabaseToDefaults, 
  AppDatabaseState,
  loadDatabaseFromFirestore,
  syncDatabaseToFirestore,
  deleteTestFromStorageAndFirestore,
  unmarkTestAsDeleted,
  saveToFirestore,
  removeFromFirestore
} from './services/storage';
import { auth, logout } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Navbar, ActiveTab } from './components/Navbar';
import { HomePortal } from './components/HomePortal';
import { Dashboard } from './components/Dashboard';
import { QuestionBank } from './components/QuestionBank';
import { QuestionEditorModal } from './components/QuestionEditorModal';
import { TestBuilder } from './components/TestBuilder';
import { StudentManager } from './components/StudentManager';
import { ExamRunner } from './components/ExamRunner';
import { ResultsAnalysis } from './components/ResultsAnalysis';
import { NominationList } from './components/NominationList';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { SupervisorAuthModal } from './components/SupervisorAuthModal';
import { ZipGradeManager } from './components/ZipGradeManager';

export default function App() {
  // Main Database State initialized as empty.
  // FIRESTORE is the single source of truth for questions, students, tests, and submissions.
  const [dbState, setDbState] = useState<AppDatabaseState>({
    settings: INITIAL_SETTINGS,
    questions: [],
    tests: [],
    students: [],
    submissions: [],
  });
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  // Auth Monitoring
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email === 'osamaabedy@gmail.com') {
        setIsSupervisorVerified(true);
        sessionStorage.setItem('supervisor_auth_verified', 'true');
      }
      // Always try to load from cloud when auth state changes (public collections are readable)
      handleLoadFromCloud();
    });
    return () => unsubscribe();
  }, []);

  // Initial cloud load attempt on mount
  useEffect(() => {
    handleLoadFromCloud();
  }, []);

  const handleLoadFromCloud = async () => {
    if (isCloudLoading) return;
    setIsCloudLoading(true);
    try {
      console.log('[APP] Fetching authoritative data from Firestore...');
      const cloudData = await loadDatabaseFromFirestore();
      if (cloudData) {
        setDbState(cloudData);
        console.log('[APP] App state synchronized with Firestore.');
      } else {
        console.warn('[APP] Firestore returned no data or is empty.');
      }
    } catch (err) {
      console.error('[APP] Critical: Failed to load from Firestore.', err);
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleSyncToCloud = async () => {
    await syncDatabaseToFirestore(dbState);
    console.log('تمت مزامنة البيانات مع السحابة بنجاح');
  };

  // Role and Navigation
  const [role, setRole] = useState<UserRole>('supervisor');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Supervisor verification via email OSAMAABEDY@GMAIL.COM
  const [isSupervisorVerified, setIsSupervisorVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('supervisor_auth_verified') === 'true';
  });
  const [isSupervisorAuthModalOpen, setIsSupervisorAuthModalOpen] = useState(false);
  const [pendingSupervisorTab, setPendingSupervisorTab] = useState<ActiveTab | null>(null);

  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('riyadh_ibda_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('riyadh_ibda_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('riyadh_ibda_theme', 'light');
    }
  }, [darkMode]);

  // Persist minimal UI settings only (deprecated for core data)
  useEffect(() => {
    // saveDatabase(dbState); // No longer needed for core data as Firestore is the Source of Truth
  }, [dbState]);

  // Modals & Interactive Flow States
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);

  // Student Exam Taking Portal state
  const [isExamActive, setIsExamActive] = useState(false);
  const [examStudent, setExamStudent] = useState<Student | null>(null);
  const [examTestId, setExamTestId] = useState<string | undefined>(undefined);
  const [examModelId, setExamModelId] = useState<string | undefined>(undefined);

  // Reports state
  const [selectedReportSubId, setSelectedReportSubId] = useState<string | null>(null);

  // ZipGrade Paper Exam state
  const [zipGradeTargetTestId, setZipGradeTargetTestId] = useState<string | undefined>(undefined);
  const [zipGradeTargetGrade, setZipGradeTargetGrade] = useState<GradeLevel | undefined>(undefined);

  // Quick switch role
  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'student') {
      setIsExamActive(true);
      setExamStudent(null);
      setExamTestId(dbState.tests[0]?.id);
      setExamModelId(dbState.tests[0]?.models[0]?.id);
    } else {
      setIsExamActive(false);
    }
  };

  // Launch Exam as Student
  const handleLaunchStudentExam = (student?: Student, testId?: string, modelId?: string) => {
    setRole('student');
    setIsExamActive(true);
    setExamStudent(student || null);
    setExamTestId(testId || dbState.tests[0]?.id);
    setExamModelId(modelId || dbState.tests[0]?.models[0]?.id);
  };

  // Finish Exam Submission
  const handleFinishExam = async (newSubmission: ExamSubmission) => {
    try {
      // 1. Save submission to Firestore first
      await saveToFirestore('submissions', newSubmission.id, newSubmission);

      // 2. Update student status in Firestore
      const student = dbState.students.find(s => s.id === newSubmission.studentId);
      if (student) {
        const updatedStudent = { ...student, status: 'completed' as const };
        await saveToFirestore('students', student.id, updatedStudent);
      }

      // 3. Update local state
      setDbState(prev => ({
        ...prev,
        submissions: [newSubmission, ...prev.submissions],
        students: prev.students.map(s => s.id === newSubmission.studentId ? { ...s, status: 'completed' as const } : s),
        // Question stats update could also be done here but it's complex for firestore atomic updates
        // We'll let the full sync handle stats occasionally or implement atomic increments later
      }));
    } catch (err) {
      alert('حدث خطأ أثناء حفظ النتيجة في السحابة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleRequestTab = (targetTab: ActiveTab) => {
    if (targetTab === 'home') {
      setActiveTab('home');
      return;
    }

    if (isSupervisorVerified) {
      setActiveTab(targetTab);
    } else {
      setPendingSupervisorTab(targetTab);
      setIsSupervisorAuthModalOpen(true);
    }
  };

  const handleSupervisorAuthSuccess = () => {
    sessionStorage.setItem('supervisor_auth_verified', 'true');
    setIsSupervisorVerified(true);
    setIsSupervisorAuthModalOpen(false);
    if (pendingSupervisorTab) {
      setActiveTab(pendingSupervisorTab);
      setPendingSupervisorTab(null);
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleExitExam = () => {
    setIsExamActive(false);
    setRole('supervisor'); // Reset role to supervisor to exit student portal
    setActiveTab('home');
  };

  // Question Management Handlers
  const handleOpenAddQuestion = () => {
    setQuestionToEdit(null);
    setIsQuestionModalOpen(true);
  };

  const handleEditQuestion = (q: Question) => {
    setQuestionToEdit(q);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (savedQ: Question) => {
    try {
      await saveToFirestore('questions', savedQ.id, savedQ);
      setDbState(prev => {
        const exists = prev.questions.some(q => q.id === savedQ.id);
        return {
          ...prev,
          questions: exists
            ? prev.questions.map(q => q.id === savedQ.id ? savedQ : q)
            : [savedQ, ...prev.questions],
        };
      });
    } catch (err) {
      alert('فشل حفظ السؤال في السحابة.');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await removeFromFirestore('questions', id);
      setDbState(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== id),
      }));
    } catch (err) {
      alert('فشل حذف السؤال من السحابة.');
    }
  };

  const handleDuplicateQuestion = async (q: Question) => {
    const duplicated: Question = {
      ...q,
      id: `q_${Date.now()}`,
      code: `${q.code}-COPY`,
      title: `${q.title} (نسخة مكررة)`,
      usageCount: 0,
      correctAnswersCount: 0,
    };
    try {
      await saveToFirestore('questions', duplicated.id, duplicated);
      setDbState(prev => ({
        ...prev,
        questions: [duplicated, ...prev.questions],
      }));
    } catch (err) {
      alert('فشل تكرار السؤال في السحابة.');
    }
  };

  const handleBulkAddQuestions = async (newQuestions: Question[]) => {
    try {
      await Promise.all(newQuestions.map(q => saveToFirestore('questions', q.id, q)));
      setDbState(prev => ({
        ...prev,
        questions: [...newQuestions, ...prev.questions],
      }));
    } catch (err) {
      alert('فشل إضافة الأسئلة دفعة واحدة إلى السحابة.');
    }
  };

  // Test Management Handlers
  const handleSaveTest = async (savedTest: Test) => {
    try {
      await saveToFirestore('tests', savedTest.id, savedTest);
      unmarkTestAsDeleted(savedTest.id);
      setDbState(prev => {
        const exists = prev.tests.some(t => t.id === savedTest.id);
        return {
          ...prev,
          tests: exists
            ? prev.tests.map(t => t.id === savedTest.id ? savedTest : t)
            : [savedTest, ...prev.tests],
        };
      });
    } catch (err) {
      alert('فشل حفظ الاختبار في السحابة.');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    setDbState(prev => ({
      ...prev,
      tests: prev.tests.filter(t => t.id !== testId),
    }));
    await deleteTestFromStorageAndFirestore(testId);
    console.log('Test deleted permanently:', testId);
  };

  const handleAddStudent = async (newStudent: Student) => {
    try {
      await saveToFirestore('students', newStudent.id, newStudent);
      setDbState(prev => ({
        ...prev,
        students: [newStudent, ...prev.students],
      }));
    } catch (err) {
      alert('فشل إضافة الطالب إلى السحابة.');
    }
  };

  const handleAddMultipleStudents = async (newStudents: Student[]) => {
    try {
      await Promise.all(newStudents.map(s => saveToFirestore('students', s.id, s)));
      setDbState(prev => ({
        ...prev,
        students: [...newStudents, ...prev.students],
      }));
    } catch (err) {
      alert('فشل إضافة الطلاب إلى السحابة.');
    }
  };

  const handleUpdateMultipleStudents = async (updatedStudents: Student[]) => {
    try {
      // For multiple, we could use a batch or individual calls. 
      // For simplicity and matching user request "directly to firestore", we'll do individual await in a loop or Promise.all
      await Promise.all(updatedStudents.map(s => saveToFirestore('students', s.id, s)));
      
      setDbState(prev => {
        const updateMap = new Map(updatedStudents.map(s => [s.id, s]));
        return {
          ...prev,
          students: prev.students.map(s => updateMap.get(s.id) || s),
        };
      });
    } catch (err) {
      alert('حدث خطأ أثناء تحديث بيانات الطلاب في السحابة.');
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    try {
      await saveToFirestore('students', updatedStudent.id, updatedStudent);
      setDbState(prev => {
        const isResetting = updatedStudent.status === 'not_started';
        
        return {
          ...prev,
          students: prev.students.map(s => s.id === updatedStudent.id ? {
            ...updatedStudent,
            status: isResetting ? 'not_started' : updatedStudent.status,
            assignedDate: isResetting ? undefined : s.assignedDate
          } : s),
          submissions: isResetting 
            ? prev.submissions.filter(sub => sub.studentId !== updatedStudent.id)
            : prev.submissions
        };
      });
    } catch (err) {
      alert('فشل تحديث بيانات الطالب في السحابة.');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await removeFromFirestore('students', studentId);
      setDbState(prev => ({
        ...prev,
        students: prev.students.filter(s => s.id !== studentId),
        submissions: prev.submissions.filter(sub => sub.studentId !== studentId)
      }));
    } catch (err) {
      alert('فشل حذف الطالب من السحابة.');
    }
  };

  const handleDeleteMultipleStudents = async (studentIds: string[]) => {
    const idSet = new Set(studentIds);
    try {
      await Promise.all(studentIds.map(id => removeFromFirestore('students', id)));
      setDbState(prev => ({
        ...prev,
        students: prev.students.filter(s => !idSet.has(s.id)),
        submissions: prev.submissions.filter(sub => !idSet.has(sub.studentId))
      }));
    } catch (err) {
      alert('فشل حذف الطلاب من السحابة.');
    }
  };

  // Update Candidate Status & Notes
  const handleUpdateCandidateStatus = async (submissionId: string, status: CandidateStatus, notes?: string) => {
    const sub = dbState.submissions.find(s => s.id === submissionId);
    if (!sub) return;

    const updatedSub = {
      ...sub,
      candidateStatus: status,
      supervisorNotes: notes !== undefined ? notes : sub.supervisorNotes,
    };

    try {
      await saveToFirestore('submissions', submissionId, updatedSub);
      setDbState(prev => ({
        ...prev,
        submissions: prev.submissions.map(s => s.id === submissionId ? updatedSub : s),
      }));
    } catch (err) {
      alert('فشل تحديث حالة الترشيح في السحابة.');
    }
  };

  // Open Report for specific submission
  const handleOpenReportForSubmission = (submissionId: string) => {
    setSelectedReportSubId(submissionId);
    setActiveTab('reports');
  };

  // Settings Handlers
  const handleSaveSettings = async (newSettings: AppSettings) => {
    try {
      await saveToFirestore('settings', 'config', newSettings);
      setDbState(prev => ({
        ...prev,
        settings: newSettings,
      }));
    } catch (err) {
      alert('فشل حفظ الإعدادات في السحابة.');
    }
  };

  const handleResetAllData = async () => {
    if (!confirm('⚠️ تحذير: سيتم حذف كافة البيانات المسجلة والنتائج وإعادة النظام للوضع الافتراضي. هل أنت متأكد؟')) return;
    
    const defaults = resetDatabaseToDefaults();
    try {
      await syncDatabaseToFirestore(defaults);
      setDbState(defaults);
      alert('تم إعادة ضبط كافة البيانات بنجاح.');
    } catch (err) {
      alert('فشل إعادة الضبط في السحابة.');
    }
  };

  const handleImportDatabase = async (imported: AppDatabaseState) => {
    try {
      await syncDatabaseToFirestore(imported);
      setDbState(imported);
      saveDatabase(imported);
      alert('تم استيراد قاعدة البيانات بنجاح.');
    } catch (err) {
      alert('فشل استيراد البيانات إلى السحابة.');
    }
  };

  const handleResetStudentTest = async (studentId: string) => {
    const student = dbState.students.find(s => s.id === studentId);
    if (!student) return;

    const updatedStudent = { ...student, status: 'not_started' as const, assignedDate: undefined };
    const submissionToRemove = dbState.submissions.find(sub => sub.studentId === studentId);

    try {
      await saveToFirestore('students', studentId, updatedStudent);
      if (submissionToRemove) {
        await removeFromFirestore('submissions', submissionToRemove.id);
      }

      setDbState(prev => ({
        ...prev,
        students: prev.students.map(s => s.id === studentId ? updatedStudent : s),
        submissions: prev.submissions.filter(sub => sub.studentId !== studentId)
      }));
      console.log(`Student ${student.fullName} has been reset for re-testing.`);
    } catch (err) {
      alert('فشل إعادة ضبط اختبار الطالب في السحابة.');
    }
  };

  const handleOpenZipGrade = (testId?: string, grade?: GradeLevel) => {
    setZipGradeTargetTestId(testId);
    setZipGradeTargetGrade(grade);
    setActiveTab('zipgrade');
  };

  const handleImportZipGradeSubmissions = async (newSubmissions: ExamSubmission[], updatedStudents: Student[]) => {
    try {
      // 1. Sync submissions and students to Firestore
      await Promise.all([
        ...newSubmissions.map(sub => saveToFirestore('submissions', sub.id, sub)),
        ...updatedStudents.map(s => saveToFirestore('students', s.id, s))
      ]);

      // 2. Update local state
      setDbState(prev => {
        const newSubIds = new Set(newSubmissions.map(s => s.id));
        const mergedSubmissions = [...newSubmissions, ...prev.submissions.filter(s => !newSubIds.has(s.id))];

        return {
          ...prev,
          submissions: mergedSubmissions,
          students: updatedStudents,
        };
      });
      console.log('ZipGrade import synced to cloud successfully.');
    } catch (err) {
      alert('حدث خطأ أثناء مزامنة بيانات ZipGrade مع السحابة.');
    }
  };

  const handleUpdateQuestionStats = async (statsMap: Record<string, any>) => {
    const updatedQuestions = dbState.questions.map(q => {
      if (statsMap[q.id]) {
        return { ...q, psychometricStats: statsMap[q.id] };
      }
      return q;
    });

    try {
      // Syncing all stats might be heavy, but these stats change when ZipGrade is imported
      // We'll update only those that changed
      const changedQuestions = updatedQuestions.filter(q => statsMap[q.id]);
      await Promise.all(changedQuestions.map(q => saveToFirestore('questions', q.id, q)));

      setDbState(prev => ({
        ...prev,
        questions: updatedQuestions
      }));
    } catch (err) {
      console.warn('Failed to update question stats in cloud:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsSupervisorVerified(false);
    sessionStorage.removeItem('supervisor_auth_verified');
    setRole('student');
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Navigation Header - Hidden during active exam */}
      {!(role === 'student' || isExamActive || activeTab === 'home') && (
        <Navbar
          role={role}
          setRole={handleSetRole}
          activeTab={activeTab}
          setActiveTab={handleRequestTab}
          settings={dbState.settings}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(prev => !prev)}
          onLaunchStudentExam={() => handleLaunchStudentExam()}
          isSupervisor={isSupervisorVerified}
          onLogout={handleLogout}
          onSync={handleSyncToCloud}
        />
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {/* Cloud Sync Status Indicator */}
        {isCloudLoading && (
          <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-sky-600 text-white px-4 py-1.5 rounded-b-xl text-[11px] font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>جاري مزامنة البيانات مع السحابة...</span>
            </div>
          </div>
        )}
        {/* If in student taking mode */}
        {role === 'student' || isExamActive ? (
          <ExamRunner
            currentStudent={examStudent}
            students={dbState.students}
            tests={dbState.tests}
            questions={dbState.questions}
            settings={dbState.settings}
            preselectedTestId={examTestId}
            preselectedModelId={examModelId}
            onFinishExam={handleFinishExam}
            onExitExam={handleExitExam}
            onResetStudentTest={handleResetStudentTest}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomePortal
                settings={dbState.settings}
                onEnterStudent={() => handleLaunchStudentExam()}
                onEnterSupervisor={() => handleRequestTab('dashboard')}
                onOpenTests={() => handleRequestTab('test_builder')}
                onOpenResults={() => handleRequestTab('results')}
              />
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                questions={dbState.questions}
                tests={dbState.tests}
                students={dbState.students}
                submissions={dbState.submissions}
                settings={dbState.settings}
                setActiveTab={setActiveTab}
                onOpenQuestionModal={handleOpenAddQuestion}
                onSelectSubmissionForReview={handleOpenReportForSubmission}
              />
            )}

            {activeTab === 'question_bank' && (
              <QuestionBank
                questions={dbState.questions}
                settings={dbState.settings}
                onOpenAddModal={handleOpenAddQuestion}
                onEditQuestion={handleEditQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onDuplicateQuestion={handleDuplicateQuestion}
                onBulkAddQuestions={handleBulkAddQuestions}
                onOpenZipGrade={(grade) => handleOpenZipGrade(undefined, grade)}
              />
            )}

            {activeTab === 'test_builder' && (
              <TestBuilder
                tests={dbState.tests}
                questions={dbState.questions}
                students={dbState.students}
                settings={dbState.settings}
                onSaveTest={handleSaveTest}
                onDeleteTest={handleDeleteTest}
                onLaunchStudentExamWithTest={(tId, mId) => handleLaunchStudentExam(undefined, tId, mId)}
                onOpenZipGradeForTest={(tId) => handleOpenZipGrade(tId)}
                onEditQuestion={handleEditQuestion}
                onSaveQuestion={handleSaveQuestion}
                onAddMultipleStudents={handleAddMultipleStudents}
                onUpdateMultipleStudents={handleUpdateMultipleStudents}
              />
            )}

            {activeTab === 'zipgrade' && (
              <ZipGradeManager
                tests={dbState.tests}
                questions={dbState.questions}
                students={dbState.students}
                submissions={dbState.submissions}
                settings={dbState.settings}
                initialSelectedTestId={zipGradeTargetTestId}
                initialGrade={zipGradeTargetGrade}
                onImportSubmissions={handleImportZipGradeSubmissions}
                onUpdateQuestionStats={handleUpdateQuestionStats}
                onNavigateToResults={() => setActiveTab('results')}
                onNavigateToReports={() => setActiveTab('reports')}
                onNavigateToNominations={() => setActiveTab('nominations')}
              />
            )}

            {activeTab === 'students' && (
              <StudentManager
                students={dbState.students}
                tests={dbState.tests}
                onAddStudent={handleAddStudent}
                onAddMultipleStudents={handleAddMultipleStudents}
                onUpdateStudent={handleUpdateStudent}
                onUpdateMultipleStudents={handleUpdateMultipleStudents}
                onDeleteStudent={handleDeleteStudent}
                onLaunchExamForStudent={(st, tId, mId) => handleLaunchStudentExam(st, tId, mId)}
                onResetStudentTest={handleResetStudentTest}
                onDeleteMultipleStudents={handleDeleteMultipleStudents}
              />
            )}

            {activeTab === 'results' && (
              <ResultsAnalysis
                submissions={dbState.submissions}
                students={dbState.students}
                tests={dbState.tests}
                questions={dbState.questions}
                settings={dbState.settings}
                onOpenReportForSubmission={handleOpenReportForSubmission}
                onUpdateCandidateStatus={handleUpdateCandidateStatus}
                onResetStudentTest={handleResetStudentTest}
              />
            )}

            {activeTab === 'nominations' && (
              <NominationList
                submissions={dbState.submissions}
                students={dbState.students}
                tests={dbState.tests}
                settings={dbState.settings}
                onUpdateCandidateStatus={handleUpdateCandidateStatus}
                onOpenReportForSubmission={handleOpenReportForSubmission}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                submissions={dbState.submissions}
                students={dbState.students}
                tests={dbState.tests}
                settings={dbState.settings}
                selectedSubmissionId={selectedReportSubId}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={dbState.settings}
                onSaveSettings={handleSaveSettings}
                onResetAllData={handleResetAllData}
                fullDatabaseState={dbState}
                onImportDatabase={handleImportDatabase}
              />
            )}
          </>
        )}
      </main>

      {/* Global Question Creator / Editor Modal */}
      <QuestionEditorModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        questionToEdit={questionToEdit}
        onSaveQuestion={handleSaveQuestion}
      />

      {/* Supervisor Email Verification Modal */}
      <SupervisorAuthModal
        isOpen={isSupervisorAuthModalOpen}
        onClose={() => {
          setIsSupervisorAuthModalOpen(false);
          setPendingSupervisorTab(null);
        }}
        onSuccess={handleSupervisorAuthSuccess}
      />

      {/* Footer (Hidden in print) */}
      <footer className="bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {dbState.settings.schoolName} – {dbState.settings.platformName}
          </span>
          <span className="font-medium text-slate-400">
            إشراف: {dbState.settings.supervisorName} | منسق الموهوبين أسامة ابراهيم | نظام الكشف المبدئي المعتمد
          </span>
        </div>
      </footer>
    </div>
  );
}
