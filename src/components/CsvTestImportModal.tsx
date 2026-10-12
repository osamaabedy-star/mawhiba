import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Test, 
  Question, 
  QuestionOption,
  QuestionType,
  GradeLevel, 
  TestLevel, 
  SkillCategory, 
  DifficultyLevel,
  GRADE_LABELS, 
  SKILL_DEFINITIONS,
  DIFFICULTY_LABELS,
  TEST_LEVEL_LABELS
} from '../types';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Image as ImageIcon, 
  ImagePlus, 
  Trash2, 
  Edit3, 
  Plus, 
  Save, 
  Sparkles, 
  Eye, 
  Layers, 
  Check, 
  Clock, 
  HelpCircle,
  Hash,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { OptionLetterBubble } from './TestBuilder';

export interface ParsedCsvQuestion {
  tempId: string;
  code: string;
  title: string;
  questionText: string;
  type: QuestionType;
  options: { id: string; text: string; imageUrl?: string }[];
  correctOptionId: string;
  skill: SkillCategory;
  difficulty: DifficultyLevel;
  points: number;
  explanation: string;
  imageUrl?: string;
}

interface CsvTestImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTests: Test[];
  onSaveTest: (test: Test) => void;
  onSaveQuestion?: (question: Question) => void;
  onBulkAddQuestions?: (questions: Question[]) => void;
  onSuccess?: (testTitle: string, questionsCount: number) => void;
}

export const CsvTestImportModal: React.FC<CsvTestImportModalProps> = ({
  isOpen,
  onClose,
  existingTests,
  onSaveTest,
  onSaveQuestion,
  onBulkAddQuestions,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  // Active step: 'upload' or 'review'
  const [activeStep, setActiveStep] = useState<'upload' | 'review'>('upload');

  // Input tab: 'file' or 'paste'
  const [inputTab, setInputTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState<string>('');

  // Test Metadata
  const [testTitle, setTestTitle] = useState<string>('مقياس كشف مبدئي - مستورد من CSV');
  const [testCode, setTestCode] = useState<string>(() => {
    const nextNum = existingTests.length + 1;
    return `TEST-${nextNum.toString().padStart(2, '0')}`;
  });
  const [targetGrades, setTargetGrades] = useState<GradeLevel[]>(['g3_primary', 'g4_primary']);
  const [testLevel, setTestLevel] = useState<TestLevel>('distinction');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [defaultPoints, setDefaultPoints] = useState<number>(5);
  const [instructions, setInstructions] = useState<string>(
    'عزيزي الطالب: اقرأ كل سؤال بعناية، وركز في الأنماط المعروضة قبل الإجابة. تأكد من تظليل الدائرة المقابلة للإجابة الصحيحة.'
  );

  // Parsed Questions state
  const [parsedQuestions, setParsedQuestions] = useState<ParsedCsvQuestion[]>([]);
  const [parsingError, setParsingError] = useState<string>('');

  // Editing Question Drawer / Modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<ParsedCsvQuestion | null>(null);

  // Search in review
  const [reviewSearch, setReviewSearch] = useState<string>('');

  // Filtered list for review view
  const filteredReviewQuestions = useMemo(() => {
    if (!reviewSearch.trim()) return parsedQuestions;
    const term = reviewSearch.trim().toLowerCase();
    return parsedQuestions.filter(q => 
      q.questionText.toLowerCase().includes(term) ||
      q.code.toLowerCase().includes(term) ||
      SKILL_DEFINITIONS[q.skill]?.name.toLowerCase().includes(term)
    );
  }, [parsedQuestions, reviewSearch]);

  const totalPoints = useMemo(() => {
    return parsedQuestions.reduce((sum, q) => sum + (q.points || 5), 0);
  }, [parsedQuestions]);

  // ==========================================
  // Helper: Mapping functions for Arabic terms
  // ==========================================
  const mapTypeFromText = (raw: string): QuestionType => {
    const clean = (raw || '').trim().toLowerCase();
    if (clean.includes('صح') || clean.includes('خطأ') || clean.includes('صواب') || clean.includes('true') || clean.includes('false')) {
      return 'true_false';
    }
    if (clean.includes('نمط') || clean.includes('pattern')) {
      return 'pattern_completion';
    }
    if (clean.includes('رقم') || clean.includes('numeric') || clean.includes('عدد')) {
      return 'numeric_input';
    }
    if (clean.includes('صور') || clean.includes('image')) {
      return 'image_choice';
    }
    return 'multiple_choice_4';
  };

  const mapSkillFromText = (raw: string): SkillCategory => {
    const clean = (raw || '').trim().toLowerCase();
    if (clean.includes('مرون') || clean.includes('flexibility')) return 'mental_flexibility';
    if (clean.includes('لغو') || clean.includes('مقروء') || clean.includes('linguistic')) return 'linguistic_reasoning';
    if (clean.includes('رياض') || clean.includes('حساب') || clean.includes('math')) return 'math_reasoning';
    if (clean.includes('بصر') || clean.includes('مكان') || clean.includes('spatial') || clean.includes('visual')) return 'spatial_visual';
    if (clean.includes('علم') || clean.includes('ميكانيك') || clean.includes('scientific')) return 'scientific_mechanical';
    if (clean.includes('مشكل') || clean.includes('منطق') || clean.includes('problem')) return 'problem_solving';
    return 'mental_flexibility';
  };

  const mapDifficultyFromText = (raw: string): DifficultyLevel => {
    const clean = (raw || '').trim().toLowerCase();
    if (clean.includes('سهل') || clean.includes('easy')) return 'easy';
    if (clean.includes('صعب') || clean.includes('hard')) return 'hard';
    if (clean.includes('متقدم') || clean.includes('advanced')) return 'advanced';
    return 'medium';
  };

  const mapCorrectOptionId = (
    rawAnswer: string, 
    options: { id: string; text: string }[],
    type: QuestionType
  ): string => {
    const clean = (rawAnswer || '').trim().toLowerCase();
    
    // Check by index or letter
    if (clean === '1' || clean === 'أ' || clean === 'ا' || clean === 'a') return 'opt_1';
    if (clean === '2' || clean === 'ب' || clean === 'b') return 'opt_2';
    if (clean === '3' || clean === 'ج' || clean === 'c') return 'opt_3';
    if (clean === '4' || clean === 'د' || clean === 'd') return 'opt_4';

    // True/False specials
    if (type === 'true_false') {
      if (clean === 'صح' || clean === 'صحيح' || clean === 'صواب' || clean === 'true') return 'opt_1';
      if (clean === 'خطأ' || clean === 'خطا' || clean === 'false') return 'opt_2';
    }

    // Match by exact option text
    const matchedOpt = options.find(opt => opt.text.trim().toLowerCase() === clean);
    if (matchedOpt) return matchedOpt.id;

    // Match by partial option text
    const partialMatch = options.find(opt => opt.text && clean && (opt.text.toLowerCase().includes(clean) || clean.includes(opt.text.toLowerCase())));
    if (partialMatch) return partialMatch.id;

    return 'opt_1';
  };

  // ==========================================
  // CSV / Matrix Parser Engine
  // ==========================================
  const parseMatrixToQuestions = (matrix: any[][]): ParsedCsvQuestion[] => {
    if (!matrix || matrix.length === 0) return [];

    // Find header row or decide if row 0 is header
    let startIdx = 0;
    const firstRowStr = matrix[0].map(c => String(c || '').toLowerCase()).join(' ');
    if (
      firstRowStr.includes('سؤال') || 
      firstRowStr.includes('نص') || 
      firstRowStr.includes('question') ||
      firstRowStr.includes('خيار') ||
      firstRowStr.includes('option')
    ) {
      startIdx = 1;
    }

    const results: ParsedCsvQuestion[] = [];
    let qSerial = 1;

    for (let i = startIdx; i < matrix.length; i++) {
      const row = matrix[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      // Ensure cells are strings
      const cells = row.map(c => (c !== undefined && c !== null ? String(c).trim() : ''));
      
      const qText = cells[0] || '';
      if (!qText || qText.length < 2) continue; // Skip blank or invalid rows

      let qTypeRaw = cells[1] || '';
      let opt1 = cells[2] || '';
      let opt2 = cells[3] || '';
      let opt3 = cells[4] || '';
      let opt4 = cells[5] || '';
      let correctRaw = cells[6] || '1';
      let skillRaw = cells[7] || '';
      let diffRaw = cells[8] || '';
      let pointsRaw = cells[9] || '';
      let expl = cells[10] || '';

      const detectedType = mapTypeFromText(qTypeRaw);

      // Handle True/False defaults
      if (detectedType === 'true_false') {
        if (!opt1) opt1 = 'صح';
        if (!opt2) opt2 = 'خطأ';
      } else {
        // Fallbacks for multiple choice if missing
        if (!opt1) opt1 = 'الخيار الأول';
        if (!opt2) opt2 = 'الخيار الثاني';
        if (!opt3) opt3 = 'الخيار الثالث';
        if (!opt4) opt4 = 'الخيار الرابع';
      }

      const options = detectedType === 'true_false' 
        ? [
            { id: 'opt_1', text: opt1 },
            { id: 'opt_2', text: opt2 },
          ]
        : [
            { id: 'opt_1', text: opt1 },
            { id: 'opt_2', text: opt2 },
            { id: 'opt_3', text: opt3 },
            { id: 'opt_4', text: opt4 },
          ];

      const correctOptionId = mapCorrectOptionId(correctRaw, options, detectedType);
      const skill = mapSkillFromText(skillRaw);
      const difficulty = mapDifficultyFromText(diffRaw);
      const points = parseInt(pointsRaw, 10) || defaultPoints || 5;

      results.push({
        tempId: `temp_csv_q_${Date.now()}_${qSerial}_${Math.random().toString(36).substring(2, 6)}`,
        code: `CSV-${qSerial.toString().padStart(2, '0')}`,
        title: qText.length > 35 ? qText.substring(0, 35) + '...' : qText,
        questionText: qText,
        type: detectedType,
        options,
        correctOptionId,
        skill,
        difficulty,
        points,
        explanation: expl,
      });

      qSerial++;
    }

    return results;
  };

  // Robust line-by-line CSV parser with quote escaping
  const parseRawCsvText = (text: string): any[][] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const matrix: any[][] = [];

    for (const line of lines) {
      // Determine delimiter (comma, tab, semicolon, pipe)
      let delimiter = ',';
      if (line.includes('\t')) delimiter = '\t';
      else if (line.includes(';') && !line.includes(',')) delimiter = ';';
      else if (line.includes('|') && !line.includes(',')) delimiter = '|';

      const row: string[] = [];
      let inQuotes = false;
      let curVal = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        const nextChar = line[c + 1];

        if (char === '"' || char === '“' || char === '”') {
          if (inQuotes && nextChar === '"') {
            curVal += '"';
            c++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          row.push(curVal.trim());
          curVal = '';
        } else {
          curVal += char;
        }
      }
      row.push(curVal.trim());
      matrix.push(row);
    }

    return matrix;
  };

  // Handle file upload (CSV or Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingError('');
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    if (fileName && fileName !== 'نموذج' && fileName !== 'template') {
      setTestTitle(fileName);
    }

    const reader = new FileReader();

    // Check if binary Excel (.xlsx / .xls)
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'binary' });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          const matrix: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
          const parsed = parseMatrixToQuestions(matrix);

          if (parsed.length === 0) {
            setParsingError('لم يتم العثور على أي أسئلة صالحة في ملف الإكسل. تأكد من تطابق الأعمدة مع النموذج.');
            return;
          }

          setParsedQuestions(parsed);
          setActiveStep('review');
        } catch (err: any) {
          setParsingError('حدث خطأ أثناء قراءة ملف الإكسل: ' + (err.message || 'صيغة غير مدعومة'));
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // Pure text CSV
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const matrix = parseRawCsvText(text);
          const parsed = parseMatrixToQuestions(matrix);

          if (parsed.length === 0) {
            setParsingError('لم يتم العثور على أسئلة صالحة في ملف CSV. تأكد من تعبئة البيانات بشكل صحيح.');
            return;
          }

          setParsedQuestions(parsed);
          setActiveStep('review');
        } catch (err: any) {
          setParsingError('حدث خطأ أثناء معالجة ملف CSV: ' + (err.message || 'تأكد من ترميز الملف UTF-8'));
        }
      };
      reader.readAsText(file, 'utf-8');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle pasted text parse
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setParsingError('يرجى لصق نصوص الأسئلة أولاً.');
      return;
    }
    setParsingError('');
    const matrix = parseRawCsvText(pastedText);
    const parsed = parseMatrixToQuestions(matrix);

    if (parsed.length === 0) {
      setParsingError('لم يتم التعرف على أي أسئلة صالحة في النص الملصق. تأكد من الفصل بفواصل أو فواصل منقوطة.');
      return;
    }

    setParsedQuestions(parsed);
    setActiveStep('review');
  };

  // ==========================================
  // Download Template Handlers
  // ==========================================
  const downloadCsvTemplate = () => {
    const headers = 'نص السؤال,نوع السؤال,الخيار الأول,الخيار الثاني,الخيار الثالث,الخيار الرابع,الإجابة الصحيحة,المهارة,مستوى الصعوبة,الدرجة,التفسير';
    const sampleRows = [
      '"ما الشكل الذي يكمل النمط الهندسي التالي؟",اختيار من متعدد,"مربع أحمر","دائرة زرقاء","مثلث أصفر","نجمة خضراء",2,الاستدلال المكاني والبصري,متوسط,5,"يتغير النمط بالتناوب المنطقي بين الأشكال الهندسية."',
      '"الكلمة الشاذة التي لا تنتمي للمجموعة هي:",اختيار من متعدد,صقر,نسر,حمامة,أسد,4,الاستدلال اللغوي وفهم المقروء,سهل,5,"الأسد من الثدييات بينما بقية الكلمات من فصيلة الطيور."',
      '"حاصل ضرب أي عدد في صفر يساوي دائماً صفر",صح أو خطأ,صح,خطأ,,,1,الاستدلال الرياضي,سهل,5,"الخاصية الصفرية المعتمدة في عملية الضرب."',
      '"ما العدد التالي في المتتابعة: 2، 4، 8، 16، ...؟",إكمال نمط,24,32,30,28,2,المرونة العقلية,متوسط,5,"تتضاعف القيمة بضرب كل حد في 2."',
      '"إذا كان أحمد أطول من علي، وعلي أطول من سعيد، فإن أقصرهم هو:",اختيار من متعدد,أحمد,علي,سعيد,لا يمكن التحديد,3,حل المشكلات والتفكير المنطقي,متوسط,5,"بالمقارنة التراتبية يتضح أن سعيد هو الأقصر."',
      '"ما الترس الذي يدور في نفس اتجاه الترس (أ) عند تعشيق 3 تروس متتالية؟",اختيار من متعدد,"الترس (ب)","الترس (ج)","كلا الترسين","لا يدور أي ترس",2,الاستدلال العلمي والميكانيكي,متقدم,5,"يتناوب اتجاه الدوران في التروس المتعاشقة مباشرة."'
    ];

    // Prepend UTF-8 BOM (\uFEFF) for 100% Arabic Excel compatibility
    const csvContent = '\uFEFF' + [headers, ...sampleRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'نموذج_صياغة_أسئلة_اختبار_موهبة.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = () => {
    const data = [
      {
        'نص السؤال': 'ما الشكل الذي يكمل النمط الهندسي التالي؟',
        'نوع السؤال': 'اختيار من متعدد',
        'الخيار الأول': 'مربع أحمر',
        'الخيار الثاني': 'دائرة زرقاء',
        'الخيار الثالث': 'مثلث أصفر',
        'الخيار الرابع': 'نجمة خضراء',
        'الإجابة الصحيحة': '2',
        'المهارة': 'الاستدلال المكاني والبصري',
        'مستوى الصعوبة': 'متوسط',
        'الدرجة': 5,
        'التفسير': 'يتغير النمط بالتناوب المنطقي بين الأشكال الهندسية.'
      },
      {
        'نص السؤال': 'الكلمة الشاذة التي لا تنتمي للمجموعة هي:',
        'نوع السؤال': 'اختيار من متعدد',
        'الخيار الأول': 'صقر',
        'الخيار الثاني': 'نسر',
        'الخيار الثالث': 'حمامة',
        'الخيار الرابع': 'أسد',
        'الإجابة الصحيحة': '4',
        'المهارة': 'الاستدلال اللغوي وفهم المقروء',
        'مستوى الصعوبة': 'سهل',
        'الدرجة': 5,
        'التفسير': 'الأسد من الثدييات بينما بقية الكلمات من فصيلة الطيور.'
      },
      {
        'نص السؤال': 'حاصل ضرب أي عدد في صفر يساوي دائماً صفر',
        'نوع السؤال': 'صح أو خطأ',
        'الخيار الأول': 'صح',
        'الخيار الثاني': 'خطأ',
        'الخيار الثالث': '',
        'الخيار الرابع': '',
        'الإجابة الصحيحة': '1',
        'المهارة': 'الاستدلال الرياضي',
        'مستوى الصعوبة': 'سهل',
        'الدرجة': 5,
        'التفسير': 'الخاصية الصفرية المعتمدة في عملية الضرب.'
      },
      {
        'نص السؤال': 'ما العدد التالي في المتتابعة: 2، 4، 8، 16، ...؟',
        'نوع السؤال': 'إكمال نمط',
        'الخيار الأول': '24',
        'الخيار الثاني': '32',
        'الخيار الثالث': '30',
        'الخيار الرابع': '28',
        'الإجابة الصحيحة': '2',
        'المهارة': 'المرونة العقلية',
        'مستوى الصعوبة': 'متوسط',
        'الدرجة': 5,
        'التفسير': 'تتضاعف القيمة بضرب كل حد في 2.'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");
    XLSX.writeFile(wb, "نموذج_صياغة_أسئلة_اختبار_موهبة.xlsx");
  };

  // ==========================================
  // Image Upload Handlers for Individual Question
  // ==========================================
  const handleProcessImageFile = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('الملف المحدد ليس صورة صالحة.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 3 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Open Quick Edit for a specific Question
  const handleOpenEditQuestion = (idx: number) => {
    setEditingIndex(idx);
    setEditingForm(JSON.parse(JSON.stringify(parsedQuestions[idx])));
  };

  // Save changes from editing form back to parsedQuestions
  const handleSaveEditingForm = () => {
    if (editingIndex === null || !editingForm) return;
    if (!editingForm.questionText.trim()) {
      alert('يرجى إدخال نص السؤال');
      return;
    }
    const updated = [...parsedQuestions];
    updated[editingIndex] = editingForm;
    setParsedQuestions(updated);
    setEditingIndex(null);
    setEditingForm(null);
  };

  // Quick remove question from review
  const handleRemoveQuestion = (idx: number) => {
    const updated = parsedQuestions.filter((_, i) => i !== idx);
    setParsedQuestions(updated);
  };

  // Quick add a manual blank question
  const handleAddBlankQuestion = () => {
    const nextSerial = parsedQuestions.length + 1;
    const newQ: ParsedCsvQuestion = {
      tempId: `temp_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: `CSV-${nextSerial.toString().padStart(2, '0')}`,
      title: 'سؤال إضافي جديد',
      questionText: 'أدخل نص السؤال هنا...',
      type: 'multiple_choice_4',
      options: [
        { id: 'opt_1', text: 'الخيار الأول' },
        { id: 'opt_2', text: 'الخيار الثاني' },
        { id: 'opt_3', text: 'الخيار الثالث' },
        { id: 'opt_4', text: 'الخيار الرابع' },
      ],
      correctOptionId: 'opt_1',
      skill: 'mental_flexibility',
      difficulty: 'medium',
      points: defaultPoints || 5,
      explanation: '',
    };
    setParsedQuestions([...parsedQuestions, newQ]);
    handleOpenEditQuestion(parsedQuestions.length);
  };

  // ==========================================
  // Final Commit & Save Test to App State / Cloud
  // ==========================================
  const handleCommitFinalTest = () => {
    if (parsedQuestions.length === 0) {
      alert('يجب أن يحتوي الاختبار على سؤال واحد على الأقل.');
      return;
    }
    if (!testTitle.trim()) {
      alert('يرجى إدخال اسم الاختبار.');
      return;
    }
    if (targetGrades.length === 0) {
      alert('يرجى تحديد صف دراسي مستهدف واحد على الأقل.');
      return;
    }

    const testId = `test_${Date.now()}`;
    const modelId = `mod_${Date.now()}_1`;

    // 1. Convert parsed questions into full Question objects
    const finalQuestions: Question[] = parsedQuestions.map((pq, idx) => {
      const qId = `q_csv_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      return {
        id: qId,
        code: `CSV-${(idx + 1).toString().padStart(2, '0')}`,
        title: pq.questionText.length > 35 ? pq.questionText.substring(0, 35) + '...' : pq.questionText,
        questionText: pq.questionText,
        type: pq.type,
        options: pq.options,
        correctOptionId: pq.correctOptionId,
        explanation: pq.explanation || '',
        skill: pq.skill,
        difficulty: pq.difficulty,
        gradeLevels: targetGrades,
        points: pq.points || defaultPoints || 5,
        estimatedTimeSeconds: 60,
        imageUrl: pq.imageUrl || undefined,
        status: 'active',
        isExperimental: false,
        usageCount: 0,
        correctAnswersCount: 0,
      };
    });

    // 2. Save questions to question bank / firestore
    if (onBulkAddQuestions) {
      onBulkAddQuestions(finalQuestions);
    } else if (onSaveQuestion) {
      finalQuestions.forEach(q => onSaveQuestion(q));
    }

    // 3. Create full Test object
    const newTest: Test = {
      id: testId,
      code: testCode.trim().toUpperCase() || 'TEST-01',
      title: testTitle.trim(),
      description: `اختبار مقنن تم استيراده بالكامل عبر CSV، يتضمن (${finalQuestions.length}) سؤالاً بمختلف المهارات العقلية.`,
      targetGrades,
      level: testLevel,
      coveredSkills: Array.from(new Set(finalQuestions.map(q => q.skill))),
      durationMinutes: durationMinutes || 25,
      pointsPerQuestion: defaultPoints || 5,
      allowBackNavigation: true,
      shuffleQuestions: false,
      shuffleOptions: true,
      showInstantResults: true,
      instructions: instructions.trim(),
      status: 'published',
      createdAt: new Date().toISOString().split('T')[0],
      assignedStudentIds: [],
      assignedGroupNames: [],
      models: [
        {
          id: modelId,
          name: 'النموذج الموحد',
          code: testCode.trim().toUpperCase() || 'TEST-01',
          questionIds: finalQuestions.map(q => q.id),
        }
      ],
    };

    onSaveTest(newTest);

    if (onSuccess) {
      onSuccess(newTest.title, finalQuestions.length);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs no-print overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95" 
        dir="rtl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  استيراد اختبار كامل من ملف CSV
                </h3>
                <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  مع دعم الصور والأنواع
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                تحديد نوع السؤال، الخيارات، والإجابة الصحيحة، مع إمكانية مراجعة وتعديل الأسئلة وإرفاق الصور
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveStep('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeStep === 'upload'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 flex items-center justify-center text-[10px]">1</span>
            <span>بيانات الاختبار وملف CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (parsedQuestions.length > 0) setActiveStep('review');
            }}
            disabled={parsedQuestions.length === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeStep === 'review'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : parsedQuestions.length > 0 
                ? 'text-slate-500 hover:text-slate-700'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 flex items-center justify-center text-[10px]">2</span>
            <span>مراجعة وتعديل الأسئلة والصور ({parsedQuestions.length})</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* STEP 1: UPLOAD / PASTE CSV & BASIC TEST DETAILS     */}
        {/* ==================================================== */}
        {activeStep === 'upload' && (
          <div className="space-y-6">
            {/* Download Professional Template Ribbon */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-sky-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    نموذج صياغة الأسئلة المعتمد (جاهز للتحميل):
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  يتضمن أعمدة: نص السؤال، نوع السؤال، الخيارات الأربعة، الإجابة الصحيحة، المهارة، الصعوبة، والدرجة.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
                  title="تحميل ملف CSV بترميز UTF-8 المتوافق مع الإكسل"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل نموذج CSV</span>
                </button>

                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  title="تحميل نموذج بصيغة إكسل (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>نموذج Excel</span>
                </button>
              </div>
            </div>

            {/* Test Core Metadata Form */}
            <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>1. إعدادات الاختبار الأساسية:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">اسم الاختبار / المقياس *</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={e => setTestTitle(e.target.value)}
                    placeholder="مثال: مقياس القدرات العقلية - النموذج الموحد"
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">كود الاختبار (رمز مفتاح الإجابة) *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={testCode}
                      onChange={e => setTestCode(e.target.value.trim().toUpperCase())}
                      placeholder="TEST-01"
                      className="w-full px-3.5 py-2 text-xs font-mono font-black tracking-wider rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={() => setTestCode(`TEST-${Math.floor(10 + Math.random() * 89)}`)}
                      className="px-2.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-xl text-[10px] font-bold shrink-0 cursor-pointer"
                    >
                      توليد كود
                    </button>
                  </div>
                </div>

                {/* Level & Duration */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">مستوى الاختبار</label>
                  <select
                    value={testLevel}
                    onChange={e => setTestLevel(e.target.value as TestLevel)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="preparation">{TEST_LEVEL_LABELS.preparation.label}</option>
                    <option value="distinction">{TEST_LEVEL_LABELS.distinction.label}</option>
                    <option value="advanced">{TEST_LEVEL_LABELS.advanced.label}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">المدة (بالدقائق)</label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(parseInt(e.target.value) || 25)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">الدرجة الافتراضية للسؤال</label>
                    <input
                      type="number"
                      value={defaultPoints}
                      onChange={e => setDefaultPoints(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Target Grades Pills */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                  الصفوف الدراسية المستهدفة:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(gr => {
                    const isSelected = targetGrades.includes(gr);
                    return (
                      <button
                        key={gr}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (targetGrades.length > 1) {
                              setTargetGrades(targetGrades.filter(g => g !== gr));
                            }
                          } else {
                            setTargetGrades([...targetGrades, gr]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-300'
                        }`}
                      >
                        {GRADE_LABELS[gr]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CSV Input Selector: File vs Paste */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>2. طريقة إدخال ملف الأسئلة:</span>
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setInputTab('file')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputTab === 'file'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    رفع ملف (CSV / Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab('paste')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputTab === 'paste'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    لصق نص مباشر
                  </button>
                </div>
              </div>

              {parsingError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parsingError}</span>
                </div>
              )}

              {inputTab === 'file' ? (
                <div className="p-8 border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-3xl bg-emerald-50/30 dark:bg-emerald-950/10 text-center space-y-3 hover:border-emerald-500 transition-colors">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv, .xlsx, .xls, .tsv, .txt"
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-800 dark:text-slate-200">
                      اضغط لاختيار ملف الاختبار أو اسحبه وأفلته هنا
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1">
                      يدعم ملفات: <strong>.CSV</strong> أو <strong>.XLSX</strong> أو <strong>.XLS</strong> بترميز UTF-8
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                  >
                    تحديد ملف الاختبار من جهازك
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder={`الصق أسطر الأسئلة هنا مباشرة... مثال:\nما الشكل التالي؟,اختيار من متعدد,مربع,دائرة,مثلث,نجمة,2,الاستدلال المكاني والبصري,متوسط,5,تفسير السؤال\nحاصل ضرب 4 في 5 هو:,اختيار من متعدد,10,20,15,25,2,الاستدلال الرياضي,سهل,5,عملية الضرب`}
                    className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all"
                    >
                      معالجة النص واستخراج الأسئلة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: REVIEW & EDIT QUESTIONS + ADD IMAGES         */}
        {/* ==================================================== */}
        {activeStep === 'review' && (
          <div className="space-y-5">
            {/* Summary Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    تم استخراج {parsedQuestions.length} سؤالاً بنجاح (إجمالي {totalPoints} درجة)
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    كود الاختبار المقترح: <strong className="font-mono text-indigo-600">#{testCode}</strong> • {testTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddBlankQuestion}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>إضافة سؤال جديد</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep('upload')}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  تعديل الملف / الإعدادات
                </button>
              </div>
            </div>

            {/* Questions Search / Filter */}
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={reviewSearch}
                onChange={e => setReviewSearch(e.target.value)}
                placeholder="بحث في الأسئلة المستخرجة..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <span className="text-xs font-bold text-slate-500 shrink-0">
                المعروض: {filteredReviewQuestions.length} من {parsedQuestions.length}
              </span>
            </div>

            {/* Questions List */}
            <div className="space-y-3 max-h-[46vh] overflow-y-auto p-1 custom-scrollbar">
              {filteredReviewQuestions.map((q, idx) => {
                const actualIndex = parsedQuestions.findIndex(item => item.tempId === q.tempId);
                const skillDef = SKILL_DEFINITIONS[q.skill];
                const diffDef = DIFFICULTY_LABELS[q.difficulty];

                return (
                  <div
                    key={q.tempId}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-750 hover:border-emerald-300 transition-all space-y-3 shadow-2xs"
                  >
                    {/* Top Row: Number, Code, Badges & Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="bg-black text-white px-2.5 py-0.5 rounded-md font-mono text-xs font-black">
                          سؤال {actualIndex + 1}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          #{q.code}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${skillDef?.color}15`,
                            color: skillDef?.color,
                          }}
                        >
                          {skillDef?.name || q.skill}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${diffDef?.color}`}>
                          {diffDef?.label || q.difficulty}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {q.points} درجات
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(actualIndex)}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل السؤال والصور</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(actualIndex)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="حذف هذا السؤال"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-relaxed">
                      {q.questionText}
                    </div>

                    {/* Question Image Preview Thumbnail */}
                    {q.imageUrl && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <img 
                          src={q.imageUrl} 
                          alt="صورة السؤال" 
                          className="max-h-16 max-w-28 object-contain rounded-lg border border-slate-200" 
                        />
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>تم إرفاق صورة توضيحية لهذا السؤال</span>
                        </div>
                      </div>
                    )}

                    {/* Options Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-950 dark:text-emerald-100 font-black ring-1 ring-emerald-500/30'
                                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <OptionLetterBubble
                                letter={['أ', 'ب', 'ج', 'د'][oIdx] || `${oIdx + 1}`}
                                size={19}
                                fontSize={9}
                              />
                              <span className="truncate">{opt.text || `خيار ${oIdx + 1}`}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {opt.imageUrl && (
                                <img
                                  src={opt.imageUrl}
                                  alt=""
                                  className="w-6 h-6 object-contain rounded border border-slate-300"
                                />
                              )}
                              {isCorrect && (
                                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                                  إجابة صحيحة ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            {activeStep === 'upload' ? (
              <button
                type="button"
                onClick={() => {
                  if (parsedQuestions.length > 0) setActiveStep('review');
                  else if (inputTab === 'file') fileInputRef.current?.click();
                  else handleProcessPastedText();
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
              >
                <span>متابعة لمراجعة الأسئلة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCommitFinalTest}
                disabled={parsedQuestions.length === 0}
                className="px-7 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 hover:from-emerald-700 hover:to-sky-800 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 cursor-pointer transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>اعتماد وحفظ الاختبار بالكامل ({parsedQuestions.length} سؤال)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* DRAWER / MODAL: EDIT SINGLE QUESTION & IMAGES        */}
      {/* ==================================================== */}
      {editingIndex !== null && editingForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-lg text-xs font-mono font-black">
                  #{editingForm.code}
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  تعديل السؤال والخيارات وإرفاق الصور
                </h4>
              </div>
              <button
                onClick={() => { setEditingIndex(null); setEditingForm(null); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">نص السؤال *</label>
              <textarea
                rows={3}
                value={editingForm.questionText}
                onChange={e => setEditingForm({ ...editingForm, questionText: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold leading-relaxed"
                placeholder="أدخل نص السؤال..."
              />
            </div>

            {/* Question Image Attachment */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>صورة السؤال (اختياري - لأشكال الأنماط والاستدلال البصري):</span>
                </label>
                {editingForm.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingForm({ ...editingForm, imageUrl: undefined })}
                    className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    إزالة الصورة
                  </button>
                )}
              </div>

              {editingForm.imageUrl ? (
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200">
                  <img
                    src={editingForm.imageUrl}
                    alt="صورة السؤال"
                    className="max-h-24 max-w-48 object-contain rounded-lg border border-slate-200"
                  />
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    تم رفع الصورة بنجاح وتطبيقها على السؤال
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={questionImageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleProcessImageFile(file, (base64) => {
                          setEditingForm({ ...editingForm, imageUrl: base64 });
                        });
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => questionImageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>رفع صورة للسؤال من جهازك</span>
                  </button>
                </div>
              )}
            </div>

            {/* Options & Correct Answer Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                خيارات الإجابة وتحديد الإجابة الصحيحة:
              </label>

              <div className="space-y-2">
                {editingForm.options.map((opt, oIdx) => {
                  const isCorrect = opt.id === editingForm.correctOptionId;
                  const letter = ['أ', 'ب', 'ج', 'د'][oIdx] || `${oIdx + 1}`;
                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {/* Radio to mark correct */}
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input
                          type="radio"
                          name="editingCorrectOption"
                          checked={isCorrect}
                          onChange={() => setEditingForm({ ...editingForm, correctOptionId: opt.id })}
                          className="w-4 h-4 text-emerald-600 accent-emerald-600"
                        />
                        <OptionLetterBubble letter={letter} size={22} fontSize={10} />
                      </label>

                      {/* Text */}
                      <input
                        type="text"
                        value={opt.text}
                        onChange={e => {
                          const updatedOpts = [...editingForm.options];
                          updatedOpts[oIdx] = { ...updatedOpts[oIdx], text: e.target.value };
                          setEditingForm({ ...editingForm, options: updatedOpts });
                        }}
                        placeholder={`نص الخيار (${letter})...`}
                        className="flex-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />

                      {/* Option Image Upload */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.imageUrl ? (
                          <div className="flex items-center gap-1">
                            <img
                              src={opt.imageUrl}
                              alt=""
                              className="w-8 h-8 object-contain rounded border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updatedOpts = [...editingForm.options];
                                updatedOpts[oIdx] = { ...updatedOpts[oIdx], imageUrl: undefined };
                                setEditingForm({ ...editingForm, options: updatedOpts });
                              }}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                              title="حذف صورة الخيار"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-indigo-500" />
                            <span>صورة</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleProcessImageFile(file, (base64) => {
                                    const updatedOpts = [...editingForm.options];
                                    updatedOpts[oIdx] = { ...updatedOpts[oIdx], imageUrl: base64 };
                                    setEditingForm({ ...editingForm, options: updatedOpts });
                                  });
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skill, Difficulty, Points Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block mb-1">المهارة المقاسة</label>
                <select
                  value={editingForm.skill}
                  onChange={e => setEditingForm({ ...editingForm, skill: e.target.value as SkillCategory })}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {(Object.keys(SKILL_DEFINITIONS) as SkillCategory[]).map(sk => (
                    <option key={sk} value={sk}>{SKILL_DEFINITIONS[sk].name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block mb-1">مستوى الصعوبة</label>
                <select
                  value={editingForm.difficulty}
                  onChange={e => setEditingForm({ ...editingForm, difficulty: e.target.value as DifficultyLevel })}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map(lvl => (
                    <option key={lvl} value={lvl}>{DIFFICULTY_LABELS[lvl].label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block mb-1">الدرجة</label>
                <input
                  type="number"
                  value={editingForm.points}
                  onChange={e => setEditingForm({ ...editingForm, points: parseInt(e.target.value) || 5 })}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">التفسير والشرح التوضيحي (اختياري)</label>
              <input
                type="text"
                value={editingForm.explanation}
                onChange={e => setEditingForm({ ...editingForm, explanation: e.target.value })}
                placeholder="تفسير سبب صحة هذه الإجابة..."
                className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setEditingIndex(null); setEditingForm(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEditingForm}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
              >
                حفظ تعديلات السؤال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
