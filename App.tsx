import React, { useState, useEffect, useRef } from 'react';

const klisLogo = "https://skyline-esl-lessons.klis-skyline.workers.dev/assets/klis-transparent-nontext-logo.png";
import { 
  EnrollmentData, 
  INITIAL_ENROLLMENT_DATA 
} from './types';
import { SAMPLE_ENROLLMENT_DATA } from './utils/sampleData';
import FormWizard from './components/FormWizard';
import PrintableDocument from './components/PrintableDocument';
import { 
  FileText, 
  Printer, 
  Save, 
  Download, 
  Upload, 
  CheckCircle2, 
  Info,
  Calendar,
  Layers,
  Heart,
  Signature
} from 'lucide-react';

export default function App() {
  const [data, setData] = useState<EnrollmentData>(() => {
    const saved = localStorage.getItem('klis_enrollment_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading saved draft", e);
      }
    }
    return INITIAL_ENROLLMENT_DATA;
  });

  const [activeTab, setActiveTab] = useState<'wizard' | 'preview'>('wizard');
  const [activeSection, setActiveSection] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save draft to local storage on changes
  useEffect(() => {
    localStorage.setItem('klis_enrollment_draft', JSON.stringify(data));
  }, [data]);

  // Handle auto-fill with Vietnamese sample data
  const handleAutofillSample = () => {
    if (window.confirm("Bạn có muốn nạp dữ liệu mẫu của học sinh Nguyễn Minh Khang để trải nghiệm ngay tính năng in ấn và ký tên không?")) {
      setData(SAMPLE_ENROLLMENT_DATA);
      setActiveSection(3); // Go to signatures section for review
    }
  };

  // Clear form
  const handleClearForm = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả thông tin đã điền và làm lại từ đầu?")) {
      setData(INITIAL_ENROLLMENT_DATA);
      setActiveSection(0);
      localStorage.removeItem('klis_enrollment_draft');
    }
  };

  // Submit to Google Sheets
  const handleSubmitToServer = async () => {
    if (!data.student.fullName) {
      alert("Vui lòng điền tối thiểu Họ và Tên học viên ở Bước 1 trước khi gửi.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const flatData = {
        studentName: data.student.fullName,
        dateOfBirth: data.student.dob,
        gender: data.student.gender === 'male' ? 'Nam' : data.student.gender === 'female' ? 'Nữ' : '',
        parentName: data.family.fatherName || data.family.motherName || '',
        phoneNumber: data.family.fatherPhone || data.family.motherPhone || '',
        email: '',
        address: data.student.address,
        previousSchool: data.medicalBackground.previousRating,
        gradeApplying: '',
        everSuspended: data.medicalBackground.everSuspended === 'yes' ? 'Có' : 'Không',
        everFailed: data.medicalBackground.everFailed === 'yes' ? 'Có' : 'Không',
        churchGoer: data.conduct.churchGoer === 'yes' ? 'Có' : 'Không',
        substanceUse: data.conduct.substanceUse === 'yes' ? 'Có' : 'Không',
        notes: data.medicalBackground.allergies ? `Dị ứng: ${data.medicalBackground.allergies}` : ''
      };

      const response = await fetch("https://script.google.com/macros/s/AKfycbz5CAc7S61lGC7xmOGkXPGDfMhKRbqpw1lwwVAlPUu04SNrfitYgTvlM3e70y1pzQ6tpg/exec", {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(flatData),
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        }
      });
      
      // Với mode no-cors, trình duyệt không đọc được phản hồi, nên ta mặc định là đã gửi lệnh đi
      alert("Tuyệt vời! Đã nộp hồ sơ trực tuyến thành công về máy chủ KLIS.");
    } catch (error) {
      console.error("Lỗi khi nộp hồ sơ:", error);
      alert("Lỗi kết nối! Trình duyệt của bạn có thể đang chặn gửi dữ liệu hoặc mạng có vấn đề.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Export current draft as JSON file
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const fileName = `KLIS_Enrollment_${data.student.fullName || 'Draft'}.json`;
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import draft from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object' && 'student' in parsed) {
          setData(parsed as EnrollmentData);
          alert("Nạp tệp sao lưu hồ sơ thành công!");
        } else {
          alert("Định dạng tệp tin không hợp lệ.");
        }
      } catch (err) {
        alert("Đã xảy ra lỗi khi đọc tệp tin.");
      }
    };
    reader.readAsText(file);
  };

  // Calculate global completion progress
  const getGlobalProgress = (): number => {
    const s = data.student;
    const f = data.family;
    const c = data.conduct;
    const sigs = data.signatures;

    const requiredFields = [
      s.fullName, s.dob, s.gender, s.address,
      f.fatherName, f.fatherPhone, f.motherName, f.motherPhone,
      c.churchGoer, c.substanceUse,
      sigs.fatherSig, sigs.motherSig
    ];

    const filledCount = requiredFields.filter(val => val && val.toString().trim() !== '').length;
    return Math.round((filledCount / requiredFields.length) * 100);
  };

  const progressPercent = getGlobalProgress();

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-800 pb-16 print:bg-white print:p-0 print:pb-0">
      
      {/* HEADER / NAVIGATION BAR (HIDDEN IN PRINT) */}
      <header className="no-print bg-[#0B1A30] text-white shadow-xl sticky top-0 z-50 transition-all border-b border-[#030914]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-5">
          {/* Logo & School Title */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img 
                src={klisLogo} 
                alt="KLIS Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-serif text-base sm:text-lg font-semibold tracking-widest uppercase text-white">
                KINGDOM OF LIGHT INTERNATIONAL SCHOOLS
              </h1>
              <p className="text-[10px] text-[#C5A85A] font-bold uppercase tracking-wider mt-0.5">
                Cổng thông tin nhập học trực tuyến / Online Enrollment Portal
              </p>
            </div>
          </div>

          {/* Top level toggle tabs */}
          <div className="flex bg-[#030914] p-1.5 rounded-full border border-slate-700/60 text-xs font-bold shadow-inner">
            <button
              onClick={() => setActiveTab('wizard')}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-all duration-300 ${
                activeTab === 'wizard' 
                  ? 'bg-[#C5A85A] text-white shadow-md shadow-[#C5A85A]/20' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Điền Hồ Sơ
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full transition-all duration-300 ${
                activeTab === 'preview' 
                  ? 'bg-[#C5A85A] text-white shadow-md shadow-[#C5A85A]/20' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Xem & In Hồ Sơ
            </button>
          </div>
        </div>
      </header>

      {/* GLOBAL PROGRESS BANNER (HIDDEN IN PRINT) */}
      <div className="no-print bg-white border-b border-slate-200/80 shadow-xs py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex items-center gap-4 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <CheckCircle2 className={`w-4 h-4 ${progressPercent === 100 ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Tiến độ hoàn thành:</span>
            </div>
            <div className="flex-1 max-w-xs bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
              <div 
                className="bg-[#C5A85A] h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[#0B1A30] font-black text-sm">{progressPercent}%</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportJSON}
              title="Sao lưu hồ sơ đã nhập ra máy tính"
              className="px-4 py-2 bg-[#0B1A30]/5 hover:bg-[#0B1A30]/10 text-[#0B1A30] font-bold border border-[#0B1A30]/10 rounded-full transition-all duration-300 flex items-center gap-1.5 text-[11px] active:scale-95 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Tải sao lưu (.json)
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Nạp lại tệp sao lưu hồ sơ từ máy tính"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-full transition-all duration-300 flex items-center gap-1.5 text-[11px] active:scale-95 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Nhập sao lưu (.json)
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportJSON} 
              accept=".json" 
              className="hidden" 
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 print:mt-0 print:p-0">
        
        {/* TAB 1: INTERACTIVE WIZARD MODE */}
        {activeTab === 'wizard' && (
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left sidebar: Status tracker & help box */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-[#0B1A30] font-semibold text-xs uppercase tracking-widest border-b border-slate-200 pb-2">
                  HƯỚNG DẪN ĐIỀN ĐƠN
                </h3>
                
                <div className="space-y-3.5 text-xs text-slate-500 leading-relaxed">
                  <div className="flex gap-2.5">
                    <Info className="w-4 h-4 text-[#C5A85A] shrink-0 mt-0.5" />
                    <p>Hãy điền chính xác thông tin học viên theo Giấy khai sinh.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <Calendar className="w-4 h-4 text-[#C5A85A] shrink-0 mt-0.5" />
                    <p>Hệ thống tự động lưu trữ bản nháp tại trình duyệt này.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <Signature className="w-4 h-4 text-[#C5A85A] shrink-0 mt-0.5" />
                    <p>Chữ ký số có thể ký bằng ngón tay trên điện thoại hoặc nhập chữ in nghiêng.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('preview');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full py-2.5 bg-[#C5A85A] hover:bg-[#B5964D] text-white text-xs font-bold rounded-full text-center transition-all shadow-md shadow-[#C5A85A]/15 active:scale-95 block"
                  >
                    Xem trước bản in A4
                  </button>
                </div>
              </div>

              {/* Document verification stats */}
              <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-4">
                <h3 className="font-serif text-[#0B1A30] font-semibold text-xs uppercase tracking-widest border-b border-slate-200 pb-2">
                  TRẠNG THÁI HỒ SƠ
                </h3>
                <ul className="space-y-3 text-xs">
                  <li className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Thông tin học viên:</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${data.student.fullName ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {data.student.fullName ? 'Đã điền' : 'Trống'}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Liên hệ khẩn cấp:</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${data.family.emergencyName ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {data.family.emergencyName ? 'Đã điền' : 'Thiếu'}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Chữ ký của Cha:</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${data.signatures.fatherSig ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {data.signatures.fatherSig ? 'Đã ký' : 'Chưa ký'}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Chữ ký của Mẹ:</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${data.signatures.motherSig ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {data.signatures.motherSig ? 'Đã ký' : 'Chưa ký'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Main Interactive Form Wizard */}
            <div className="lg:col-span-9">
              <FormWizard
                data={data}
                onChange={setData}
                onAutofillSample={handleAutofillSample}
                onClearForm={handleClearForm}
                activeSection={activeSection}
                setActiveSection={setActiveSection}
              />
            </div>
          </div>
        )}

        {/* TAB 2: PRINT PREVIEW SHEET MODE */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            
            {/* Quick action helper bar (Hidden in print) */}
            <div className="no-print bg-amber-50/50 border border-amber-200 p-5 rounded-[1.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex gap-2.5 items-start">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p className="font-bold uppercase tracking-wider text-[10px]">Chế độ xem trước Bản in A4 chính thức</p>
                  <p className="mt-1">Bản xem trước này hiển thị bố cục chính xác của tài liệu khi in ra giấy. Khi bạn nhấp vào nút "In hồ sơ", tất cả các thành phần giao diện thừa sẽ tự động ẩn đi.</p>
                </div>
              </div>

              <div className="flex gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('wizard')}
                  className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full transition-colors shadow-xs active:scale-95"
                >
                  Quay lại sửa thông tin
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 text-xs font-bold bg-[#0B1A30] hover:bg-[#0B1A30]/90 text-white rounded-full shadow-md shadow-[#0B1A30]/10 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  In Hồ Sơ (Print A4)
                </button>
              </div>
            </div>

            {/* Simulated Sheet of Paper Render */}
            <div className="bg-slate-200/40 p-2 sm:p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-xs print:bg-white print:border-none print:p-0">
              <PrintableDocument data={data} />
            </div>

            {/* Bottom floating print button */}
            <div className="no-print flex flex-col items-center gap-3 pt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmitToServer}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                >
                  {isSubmitting ? "Đang gửi..." : "Nộp Hồ Sơ Trực Tuyến"}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#0B1A30] hover:bg-[#0B1A30]/95 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-lg shadow-[#0B1A30]/15 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Printer className="w-5 h-5 text-[#C5A85A]" />
                  In hồ sơ ngay (PDF/A4)
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Mẹo: Chọn "Lưu dưới dạng PDF" (Save as PDF) trong hộp thoại in của trình duyệt để có bản mềm chính thức.</p>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
