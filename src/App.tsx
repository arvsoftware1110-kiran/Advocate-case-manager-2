import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Briefcase, 
  MapPin, 
  Scale, 
  User, 
  Hash, 
  Trash2, 
  Pencil,
  Phone,
  LayoutDashboard,
  FileText,
  ChevronRight,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Filter,
  Calendar,
  CalendarDays,
  CheckSquare,
  Square,
  Link,
  ChevronLeft,
  Download,
  Cloud,
  Settings,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Upload,
  Users,
  Clock3,
  ClipboardList,
  LogOut,
  LogIn,
  Database
} from 'lucide-react';
import { Case, STAGES, CaseStage, PriorityCase, Staff, Attendance, IORegister, AllocateWork, Master } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function App() {
  const [cases, setCases] = useState<Case[]>([]);
  const [priorityCases, setPriorityCases] = useState<PriorityCase[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [ioregister, setIoregister] = useState<IORegister[]>([]);
  const [allocatework, setAllocatework] = useState<AllocateWork[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [view, setView] = useState<'dashboard' | 'entry' | 'award_passed' | 'case_view' | 'filing_entry' | 'filing_view' | 'fit_cases' | 'connected_cases' | 'priority_entry' | 'priority_view' | 'staff_entry' | 'attendance' | 'view_attendance' | 'settings' | 'case_allotment' | 'remarkable_cases' | 'ioregister' | 'work_allocation' | 'master' | 'pending_work'>('dashboard');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedViewDate, setSelectedViewDate] = useState<string>('');
  const [filingSearch, setFilingSearch] = useState('');
  const [selectedCaseForFiling, setSelectedCaseForFiling] = useState<number | null>(null);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{success?: boolean, message?: string} | null>(null);
  const [completingWorkId, setCompletingWorkId] = useState<number | null>(null);
  const [completionRemark, setCompletionRemark] = useState('');
  const [pendingWorkCompletionDates, setPendingWorkCompletionDates] = useState<Record<number, string>>({});
  const [showCompletedWork, setShowCompletedWork] = useState(false);
  const [pendingWorkFilters, setPendingWorkFilters] = useState({
    client: '',
    court: '',
    caseType: '',
    wsFiled: 'all'
  });
  const [importingExcel, setImportingExcel] = useState(false);
  const [excelStatus, setExcelStatus] = useState<{success?: boolean, message?: string} | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState<string>('');

  // Helper to format date without timezone shift
  const formatDate = (dateStr: string | undefined | null, options?: Intl.DateTimeFormatOptions) => {
    if (!dateStr) return '';
    try {
      // Normalize to YYYY-MM-DD
      const normalized = dateStr.split('T')[0].split(' ')[0];
      const [year, month, day] = normalized.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
      
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, options || { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const getRawDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0].split(' ')[0];
  };
  
  // Fit cases search state
  const [fitCasesSearch, setFitCasesSearch] = useState({
    clientName: '',
    petitionerAdvocate: '',
    caseType: '',
    appearingFor: 'all'
  });

  // Filing filter state
  const [filingFilters, setFilingFilters] = useState({
    date: '',
    refNill: false,
    cfNill: false
  });
  
  // Award filter state
  const [awardFilter, setAwardFilter] = useState({
    pendingCopyApp: false,
    copyReceived: false,
    legalOpinion: false,
    amountReceived: false,
    receiptSent: false
  });

  // Priority filter state
  const [priorityFilters, setPriorityFilters] = useState({
    status: 'all' as 'all' | 'pending' | 'completed',
    dateRange: 'all' as 'all' | '10' | '15' | 'custom',
    customDate: '',
    clientName: ''
  });

  // Attendance filter state
  const [attendanceFilters, setAttendanceFilters] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const [caseViewFilters, setCaseViewFilters] = useState({
    clientName: '',
    appearingFor: 'all',
    caseYear: '',
    advocateName: ''
  });

  // Allotment filter state
  const [allotmentFilters, setAllotmentFilters] = useState({
    year: '',
    client: '',
    appearingFor: 'all'
  });

  const initialFormData = {
    case_number: '',
    client_name: '',
    court: '',
    file_location: '',
    stage: 'Hearing' as CaseStage,
    award_passed_date: '',
    copy_app_filed_date: '',
    award_copy_received: 0,
    legal_opinion_given: 0,
    amount_received: 0,
    receipt_sent: 0,
    disposed_date: '',
    hearing_date: '',
    other_details: '',
    next_posting_date: '',
    filing_details: '',
    filed_on: '',
    ref_number: '',
    cf_number: '',
    filing_other: '',
    petitioner_advocate: '',
    chance_for_settlement: 0,
    ca_received_date: '',
    legal_opinion_sent_date: '',
    case_type: 'Other' as 'Injury' | 'Death' | 'Other',
    is_connected: 0,
    connected_case_number: '',
    counsel_other_side: '',
    appearing_for: 'Petitioner' as any,
    remarkable_case: 'No' as 'Yes' | 'No',
    remarkable_comments: '',
    case_year: new Date().getFullYear().toString(),
    ws_filed: 'No' as 'Yes' | 'No',
    investigation_received: 'No' as 'Yes' | 'No',
    immediate_action: 'No' as 'Yes' | 'No',
    immediate_action_remarks: '',
    immediate_action_completed_date: ''
  };

  // Form state
  const [formData, setFormData] = useState(initialFormData);

  const [priorityFormData, setPriorityFormData] = useState({
    case_number: '',
    purpose: '',
    remind_on: '',
    status: 'pending' as 'pending' | 'completed'
  });

  const [staffFormData, setStaffFormData] = useState({
    staff_name: '',
    designation: '',
    mobile_number: '',
    address: '',
    joined_on: '',
    relieved_on: '',
    blood_group: ''
  });

  const [ioFormData, setIoFormData] = useState({
    type: 'Inward' as 'Inward' | 'Outward',
    case_number: '',
    case_year: new Date().getFullYear().toString(),
    client_name: '',
    document_received: '',
    date: '',
    staff_name: '',
    via: '',
    ref_no: ''
  });

  const [ioFilters, setIoFilters] = useState({
    case_number: '',
    case_year: '',
    client_name: '',
    inward_on: '',
    outward_on: '',
    staff_name: ''
  });

  const [workFormData, setWorkFormData] = useState({
    case_number: '',
    staff_name: '',
    assign_date: '',
    complete_by_date: '',
    work_details: '',
    status: 'Pending' as 'Pending' | 'Completed',
    remark: ''
  });

  const [workFilters, setWorkFilters] = useState({
    case_number: '',
    staff_name: '',
    assign_date: '',
    complete_by_date: '',
    work_details: '',
    status: 'all' as 'all' | 'Pending' | 'Completed',
    remark: ''
  });

  const [ioSubView, setIoSubView] = useState<'Inward' | 'Outward' | 'View'>('Inward');
  const [workSubView, setWorkSubView] = useState<'Allot' | 'View'>('Allot');
  const [masterFormData, setMasterFormData] = useState({
    category: 'Advocate' as 'Advocate' | 'Client' | 'Court' | 'Case Category' | 'Shelf',
    name: ''
  });

  const [filingFormData, setFilingFormData] = useState({
    filing_details: '',
    filed_on: '',
    ref_number: '',
    cf_number: '',
    filing_other: ''
  });

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const checkDatabase = async () => {
    setCheckingDb(true);
    try {
      const res = await fetch('/api/db-check');
      const data = await res.json();
      setDbStatus(data);
      return data.status === 'ok';
    } catch (err) {
      console.error('Failed to check database:', err);
      setDbStatus({ status: 'error', message: 'Failed to connect to check endpoint' });
      return false;
    } finally {
      setCheckingDb(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const ok = await checkDatabase();
      if (ok) {
        await Promise.all([
          fetchCases(),
          fetchPriorityCases(),
          fetchStaff(),
          fetchAttendance(),
          fetchIORegister(),
          fetchAllocateWork(),
          fetchMasters()
        ]);
      }
      checkGoogleStatus();
      setLoading(false);
    };

    init();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        checkGoogleStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const response = await fetch('/api/auth/google/status', { credentials: 'include' });
      const data = await response.json();
      setGoogleDriveConnected(data.connected);
    } catch (error) {
      console.error("Failed to check Google status:", error);
    }
  };

  const connectGoogleDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url', { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get auth URL');
      }
      const { url } = await response.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (error) {
      console.error("Failed to get Google Auth URL:", error);
      showNotification("Failed to connect to Google Drive. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in the environment.", "error");
    }
  };

  const performBackup = async () => {
    setBackingUp(true);
    setBackupStatus(null);
    try {
      const response = await fetch('/api/backup/google-drive', { 
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setBackupStatus({ success: true, message: 'Backup successful!' });
      } else {
        setBackupStatus({ success: false, message: data.error || 'Backup failed' });
      }
    } catch (error) {
      setBackupStatus({ success: false, message: 'Backup failed' });
    } finally {
      setBackingUp(false);
    }
  };

  const exportExcel = () => {
    window.location.href = '/api/export-excel';
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingExcel(true);
    setExcelStatus(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        if (data.errors && data.errors.length > 0) {
          setExcelStatus({ 
            success: true, 
            message: `${data.message} Errors: ${data.errors.join(', ')}` 
          });
        } else {
          setExcelStatus({ success: true, message: `Successfully imported ${data.count} cases!` });
        }
        fetchCases();
      } else {
        setExcelStatus({ success: false, message: data.error || 'Import failed' });
      }
    } catch (error) {
      setExcelStatus({ success: false, message: 'Import failed' });
    } finally {
      setImportingExcel(false);
      e.target.value = '';
    }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCases(data);
        setDbError(null);
      } else {
        // If it's a missing table error, don't set the global dbError banner
        // as the Setup Required view will handle it.
        if (data.details?.includes('Could not find the table')) {
          setCases([]);
          return;
        }
        console.error('API returned non-array data:', data);
        setDbError(data.details || data.error || 'Unknown database error');
        setCases([]);
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
      setDbError('Failed to connect to the server');
      setCases([]);
    }
  };

  const fetchPriorityCases = async () => {
    try {
      const res = await fetch('/api/priority');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPriorityCases(data);
        setDbError(null);
      } else {
        if (data.details?.includes('Could not find the table')) {
          setPriorityCases([]);
          return;
        }
        console.error('API returned non-array data for priority:', data);
        setDbError(data.details || data.error || 'Priority table error');
        setPriorityCases([]);
      }
    } catch (err) {
      console.error('Error fetching priority cases:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      if (Array.isArray(data)) {
        setStaff(data);
        setDbError(null);
      } else {
        if (data.details?.includes('Could not find the table')) {
          setStaff([]);
          return;
        }
        console.error('API returned non-array data for staff:', data);
        setDbError(data.details || data.error || 'Staff table error');
        setStaff([]);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAttendance(data);
        setDbError(null);
      } else {
        if (data.details?.includes('Could not find the table')) {
          setAttendance([]);
          return;
        }
        console.error('API returned non-array data for attendance:', data);
        setDbError(data.details || data.error || 'Attendance table error');
        setAttendance([]);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const fetchIORegister = async () => {
    try {
      const res = await fetch('/api/ioregister');
      const data = await res.json();
      if (Array.isArray(data)) {
        setIoregister(data);
      }
    } catch (err) {
      console.error('Error fetching ioregister:', err);
    }
  };

  const fetchAllocateWork = async () => {
    try {
      const res = await fetch('/api/allocatework');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllocatework(data);
      }
    } catch (err) {
      console.error('Error fetching work allocations:', err);
    }
  };

  const fetchMasters = async () => {
    try {
      const res = await fetch('/api/masters');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMasters(data);
      }
    } catch (err) {
      console.error('Error fetching masters:', err);
    }
  };

  const handleMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterFormData.name.trim()) {
      showNotification('Please enter a name', 'error');
      return;
    }
    try {
      const res = await fetch('/api/masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterFormData)
      });
      if (res.ok) {
        setMasterFormData({ ...masterFormData, name: '' });
        fetchMasters();
        showNotification(`${masterFormData.category} added successfully!`);
      } else {
        const errorData = await res.json();
        showNotification(`Failed to add entry: ${errorData.details || errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error saving master:', err);
      showNotification('Failed to connect to the server.', 'error');
    }
  };

  const resetMasterForm = () => {
    setMasterFormData({
      category: 'Advocate',
      name: ''
    });
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffFormData)
      });
      if (res.ok) {
        setStaffFormData({
          staff_name: '',
          designation: '',
          mobile_number: '',
          address: '',
          joined_on: '',
          relieved_on: '',
          blood_group: ''
        });
        fetchStaff();
        showNotification('Staff member added successfully!');
      } else {
        const errorData = await res.json();
        showNotification(`Failed to add staff: ${errorData.details || errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error saving staff:', err);
      showNotification('Failed to connect to the server. Please check your connection.', 'error');
    }
  };

  const handlePunch = async (type: 'attendance' | 'in' | 'out') => {
    if (!selectedStaffForAttendance) {
      showNotification('Please select a staff member first', 'error');
      return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const date = now.toISOString().split('T')[0];

    try {
      const res = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          staff_name: selectedStaffForAttendance, 
          type, 
          date, 
          time: type === 'attendance' ? null : time 
        })
      });
      
      if (res.ok) {
        fetchAttendance();
        let msg = '';
        if (type === 'attendance') msg = `Attendance punched successfully for ${selectedStaffForAttendance}`;
        if (type === 'in') msg = `Punched in successfully for ${selectedStaffForAttendance} at ${time}`;
        if (type === 'out') msg = `Punched out successfully for ${selectedStaffForAttendance} at ${time}`;
        showNotification(msg);
      } else {
        const errorData = await res.json();
        showNotification(`Punch failed: ${errorData.details || errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error punching:', err);
      showNotification('Failed to connect to the server.', 'error');
    }
  };

  const resetAttendance = () => {
    setSelectedStaffForAttendance('');
  };

  const exportAttendancePDF = () => {
    const doc = new jsPDF();
    const filtered = attendance.filter(a => a.punch_in_date.startsWith(attendanceFilters.month));
    
    doc.setFontSize(18);
    doc.text(`Attendance Report - ${attendanceFilters.month}`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = filtered.map(a => [
      a.staff_name,
      formatDate(a.punch_in_date),
      a.punch_in_time || '-',
      a.punch_out_time || '-',
      a.punch_out_date ? formatDate(a.punch_out_date) : '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Staff Name', 'Date', 'Punch In', 'Punch Out', 'Out Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47] }
    });

    doc.save(`attendance_${attendanceFilters.month}.pdf`);
  };

  const handleIoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ioregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ioFormData)
      });
      if (res.ok) {
        showNotification('Entry saved successfully!');
        fetchIORegister();
        setIoSubView('View');
      }
    } catch (err) {
      console.error('Error saving IO entry:', err);
      showNotification('Failed to save entry', 'error');
    }
  };

  const resetIoForm = () => {
    setIoFormData({
      type: ioSubView === 'Inward' ? 'Inward' : 'Outward',
      case_number: '',
      case_year: new Date().getFullYear().toString(),
      client_name: '',
      document_received: '',
      date: '',
      staff_name: '',
      via: '',
      ref_no: ''
    });
  };

  const exportIoPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Inward Outward Register', 14, 22);
    
    const tableData = ioregister
      .filter(item => {
        const matchCase = !ioFilters.case_number || item.case_number.toLowerCase().includes(ioFilters.case_number.toLowerCase());
        const matchYear = !ioFilters.case_year || item.case_year === ioFilters.case_year;
        const matchClient = !ioFilters.client_name || item.client_name.toLowerCase().includes(ioFilters.client_name.toLowerCase());
        const matchStaff = !ioFilters.staff_name || item.staff_name.toLowerCase().includes(ioFilters.staff_name.toLowerCase());
        const matchInward = !ioFilters.inward_on || (item.type === 'Inward' && getRawDate(item.date) === ioFilters.inward_on);
        const matchOutward = !ioFilters.outward_on || (item.type === 'Outward' && getRawDate(item.date) === ioFilters.outward_on);
        return matchCase && matchYear && matchClient && matchStaff && matchInward && matchOutward;
      })
      .map(item => [
        item.type,
        `${item.case_number}/${item.case_year}`,
        item.client_name,
        item.document_received,
        formatDate(item.date),
        item.staff_name,
        item.via,
        item.ref_no
      ]);

    autoTable(doc, {
      startY: 30,
      head: [['Type', 'Case No', 'Client', 'Document', 'Date', 'Staff', 'Via', 'Ref No']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47] }
    });

    doc.save('ioregister.pdf');
  };

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/allocatework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workFormData)
      });
      if (res.ok) {
        showNotification('Work allotted successfully!');
        fetchAllocateWork();
        setWorkSubView('View');
      }
    } catch (err) {
      console.error('Error allotting work:', err);
      showNotification('Failed to allot work', 'error');
    }
  };

  const handleUpdateWorkStatus = async (id: number, status: 'Pending' | 'Completed', remark?: string) => {
    try {
      const actual_completion_date = status === 'Completed' ? new Date().toISOString().split('T')[0] : null;
      const res = await fetch(`/api/allocatework/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actual_completion_date, remark: remark || null })
      });
      if (res.ok) {
        const message = status === 'Completed' 
          ? `Work marked as completed! ${remark ? 'Remark saved.' : ''}` 
          : 'Work status reset to pending.';
        showNotification(message);
        fetchAllocateWork();
        setCompletingWorkId(null);
        setCompletionRemark('');
      }
    } catch (err) {
      console.error('Error updating work status:', err);
      showNotification('Failed to update status', 'error');
    }
  };

  const resetWorkForm = () => {
    setWorkFormData({
      case_number: '',
      staff_name: '',
      assign_date: '',
      complete_by_date: '',
      work_details: '',
      status: 'Pending',
      remark: ''
    });
  };

  const exportWorkPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Work Allocation Register', 14, 22);
    
    const tableData = allocatework
      .filter(item => {
        const matchCase = !workFilters.case_number || item.case_number.toLowerCase().includes(workFilters.case_number.toLowerCase());
        const matchStaff = !workFilters.staff_name || item.staff_name.toLowerCase().includes(workFilters.staff_name.toLowerCase());
        const matchAssign = !workFilters.assign_date || getRawDate(item.assign_date) === workFilters.assign_date;
        const matchComplete = !workFilters.complete_by_date || getRawDate(item.complete_by_date) === workFilters.complete_by_date;
        const matchDetails = !workFilters.work_details || item.work_details.toLowerCase().includes(workFilters.work_details.toLowerCase());
        const matchStatus = workFilters.status === 'all' || item.status === workFilters.status;
        return matchCase && matchStaff && matchAssign && matchComplete && matchDetails && matchStatus;
      })
      .map(item => {
        const caseData = cases.find(c => c.case_number === item.case_number);
        const court = caseData?.court || 'N/A';
        const type = caseData?.case_type || 'N/A';
        return [
          `${item.case_number}\n(${court} - ${type})`,
          item.staff_name,
          formatDate(item.assign_date),
          formatDate(item.complete_by_date),
          item.work_details,
          item.status || 'Pending',
          item.remark || '-',
          item.actual_completion_date ? formatDate(item.actual_completion_date) : '-'
        ];
      });

    autoTable(doc, {
      startY: 30,
      head: [['Case No, Court & Type', 'Staff Name', 'Assign Date', 'Complete By', 'Details', 'Status', 'Remark', 'Done On']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47] }
    });

    doc.save('work_allocation.pdf');
  };

  const handlePrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/priority/${editingId}` : '/api/priority';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priorityFormData)
      });
      if (res.ok) {
        setPriorityFormData({
          case_number: '',
          purpose: '',
          remind_on: '',
          status: 'pending'
        });
        setEditingId(null);
        fetchPriorityCases();
        showNotification(editingId ? 'Priority case updated successfully!' : 'Priority case added successfully!');
        setView('priority_view');
      }
    } catch (err) {
      console.error('Error saving priority case:', err);
    }
  };

  const handlePriorityDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this priority case?')) return;
    try {
      const res = await fetch(`/api/priority/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPriorityCases();
        showNotification('Priority case deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting priority case:', err);
    }
  };

  const handlePriorityStatusToggle = async (priorityCase: PriorityCase) => {
    const newStatus = priorityCase.status === 'pending' ? 'completed' : 'pending';
    try {
      const res = await fetch(`/api/priority/${priorityCase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...priorityCase, status: newStatus })
      });
      if (res.ok) {
        fetchPriorityCases();
        showNotification(`Case marked as ${newStatus}!`);
      }
    } catch (err) {
      console.error('Error updating priority status:', err);
    }
  };

  const exportPriorityPDF = () => {
    const doc = new jsPDF();
    const filtered = getFilteredPriorityCases();
    
    doc.setFontSize(18);
    doc.text('Priority Cases Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = filtered.map(pc => {
      const caseObj = cases.find(c => c.case_number === pc.case_number);
      return [
        pc.case_number,
        caseObj?.client_name || '-',
        caseObj?.next_posting_date ? formatDate(caseObj.next_posting_date) : '-',
        pc.purpose,
        formatDate(pc.remind_on),
        pc.status.toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Case Number', 'Client Name', 'Next Posting', 'Purpose', 'Remind On', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47] }
    });

    doc.save('priority_cases.pdf');
  };

  const exportAwardPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Award Passed Cases Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = awardPassedCases.map(c => [
      c.case_number,
      c.client_name,
      c.award_passed_date ? formatDate(c.award_passed_date) : '-',
      c.copy_app_filed_date ? formatDate(c.copy_app_filed_date) : 'Pending',
      c.ca_received_date ? formatDate(c.ca_received_date) : 'Not Received',
      c.legal_opinion_sent_date ? formatDate(c.legal_opinion_sent_date) : 'Pending',
      c.amount_received ? 'Paid' : 'Not Paid',
      c.receipt_sent ? 'Sent' : 'Not Sent'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Case No', 'Client', 'Award Date', 'Copy App', 'Award Copy', 'Legal Op', 'Payment', 'Receipt']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47] },
      styles: { fontSize: 8 }
    });

    doc.save('award_passed_cases.pdf');
  };

  const getFilteredPriorityCases = () => {
    let filtered = [...priorityCases];
    
    // Status filter
    if (priorityFilters.status !== 'all') {
      filtered = filtered.filter(pc => pc.status === priorityFilters.status);
    }
    
    // Client Name filter
    if (priorityFilters.clientName) {
      filtered = filtered.filter(pc => {
        const caseObj = cases.find(c => c.case_number === pc.case_number);
        return caseObj?.client_name.toLowerCase().includes(priorityFilters.clientName.toLowerCase());
      });
    }
    
    // Date range filter
    if (priorityFilters.dateRange !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (priorityFilters.dateRange === '10' || priorityFilters.dateRange === '15') {
        const limitDate = new Date();
        limitDate.setDate(today.getDate() + parseInt(priorityFilters.dateRange));
        limitDate.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(pc => {
          const remindDate = new Date(pc.remind_on);
          return remindDate >= today && remindDate <= limitDate;
        });
      } else if (priorityFilters.dateRange === 'custom' && priorityFilters.customDate) {
        filtered = filtered.filter(pc => getRawDate(pc.remind_on) === priorityFilters.customDate);
      }
    }
    
    return filtered;
  };

  const handleImmediateActionComplete = async (caseId: number, status: 'Yes' | 'No', completionDate: string) => {
    const caseToUpdate = cases.find(c => c.id === caseId);
    if (!caseToUpdate) return;

    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...caseToUpdate,
          immediate_action: status,
          immediate_action_completed_date: completionDate
        })
      });

      if (res.ok) {
        fetchCases();
        showNotification(status === 'No' ? 'Work marked as completed!' : 'Work marked as pending!');
      }
    } catch (err) {
      console.error('Error updating immediate action:', err);
    }
  };

  const exportPendingWorkPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const filteredCases = cases
      .filter(c => showCompletedWork ? (c.immediate_action === 'Yes' || c.immediate_action === 'No') && c.immediate_action_remarks : c.immediate_action === 'Yes')
      .filter(c => {
        const matchesClient = c.client_name.toLowerCase().includes(pendingWorkFilters.client.toLowerCase());
        const matchesCourt = c.court.toLowerCase().includes(pendingWorkFilters.court.toLowerCase());
        const matchesCaseType = (c.case_type || '').toLowerCase().includes(pendingWorkFilters.caseType.toLowerCase());
        const matchesWS = pendingWorkFilters.wsFiled === 'all' || 
          (pendingWorkFilters.wsFiled === 'Yes' ? c.ws_filed === 'Yes' : c.ws_filed !== 'Yes');
        return matchesClient && matchesCourt && matchesCaseType && matchesWS;
      });
    
    doc.setFontSize(18);
    doc.text('Pending Work Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = filteredCases.map(c => [
      c.case_number,
      c.court,
      c.client_name,
      c.case_type || '-',
      c.next_posting_date ? formatDate(c.next_posting_date) : '-',
      c.investigation_received || 'No',
      c.ws_filed === 'Yes' ? 'Filed' : 'Not Filed',
      c.immediate_action_remarks || '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Case No', 'Court', 'Client', 'Type', 'Next Posting', 'Inv. Recv', 'WS Filed', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47] },
      styles: { fontSize: 8 }
    });

    doc.save('pending_work.pdf');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.immediate_action === 'Yes' && !formData.immediate_action_remarks.trim()) {
      showNotification('Immediate Action Remarks are mandatory when Immediate Action is Yes.', 'error');
      return;
    }

    try {
      const url = editingId ? `/api/cases/${editingId}` : '/api/cases';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData(initialFormData);
        setEditingId(null);
        await fetchCases();
        showNotification(editingId ? 'Case updated successfully!' : 'Case added successfully!');
        setView('dashboard');
      } else {
        let errorMsg = 'Unknown error';
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorData = await res.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } else {
            errorMsg = await res.text();
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        showNotification(`Failed to save case: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('Error saving case:', err);
      showNotification(`An unexpected error occurred: ${err.message || 'Check console for details'}`, 'error');
    }
  };

  const startEditing = (c: Case) => {
    setFormData({
      case_number: c.case_number || '',
      client_name: c.client_name || '',
      court: c.court || '',
      file_location: c.file_location || '',
      stage: (c.stage as CaseStage) || 'Hearing',
      award_passed_date: c.award_passed_date || '',
      copy_app_filed_date: c.copy_app_filed_date || '',
      award_copy_received: c.award_copy_received || 0,
      legal_opinion_given: c.legal_opinion_given || 0,
      amount_received: c.amount_received || 0,
      receipt_sent: c.receipt_sent || 0,
      disposed_date: c.disposed_date || '',
      hearing_date: c.hearing_date || '',
      other_details: c.other_details || '',
      next_posting_date: c.next_posting_date || '',
      filing_details: c.filing_details || '',
      filed_on: c.filed_on || '',
      ref_number: c.ref_number || '',
      cf_number: c.cf_number || '',
      filing_other: c.filing_other || '',
      petitioner_advocate: c.petitioner_advocate || '',
      chance_for_settlement: c.chance_for_settlement || 0,
      ca_received_date: c.ca_received_date || '',
      legal_opinion_sent_date: c.legal_opinion_sent_date || '',
      case_type: c.case_type || 'Other',
      is_connected: c.is_connected || 0,
      connected_case_number: c.connected_case_number || '',
      counsel_other_side: c.counsel_other_side || '',
      appearing_for: c.appearing_for || 'Petitioner',
      remarkable_case: c.remarkable_case || 'No',
      remarkable_comments: c.remarkable_comments || '',
      case_year: c.case_year || new Date().getFullYear().toString(),
      ws_filed: c.ws_filed || 'No',
      investigation_received: c.investigation_received || 'No',
      immediate_action: c.immediate_action || 'No',
      immediate_action_remarks: c.immediate_action_remarks || '',
      immediate_action_completed_date: c.immediate_action_completed_date || ''
    });
    setEditingId(c.id);
    setView('entry');
  };

  const exportFitCasesPDF = () => {
    const doc = new jsPDF();
    const fitCases = cases
      .filter(c => c.chance_for_settlement === 1)
      .filter(c => c.stage !== 'Award Passed' && c.stage !== 'Disposed')
      .filter(c => c.client_name.toLowerCase().includes(fitCasesSearch.clientName.toLowerCase()))
      .filter(c => (c.petitioner_advocate || '').toLowerCase().includes(fitCasesSearch.petitionerAdvocate.toLowerCase()))
      .filter(c => fitCasesSearch.caseType === '' || c.case_type === fitCasesSearch.caseType)
      .filter(c => fitCasesSearch.appearingFor === 'all' || c.appearing_for === fitCasesSearch.appearingFor);

    const tableData = fitCases.map(c => [
      c.case_number,
      c.client_name,
      c.case_type || 'Other',
      c.stage || '-',
      c.petitioner_advocate || '-',
      c.court
    ]);

    doc.setFontSize(18);
    doc.text("Fit Cases List", 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      head: [['Case Number', 'Client Name', 'Case Type', 'Stage', 'Petitioner Advocate', 'Court']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 30, 62] },
    });
    doc.save("fit_cases_list.pdf");
  };

  const exportCaseViewPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Case View Schedule Report", 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    if (caseViewFilters.clientName || caseViewFilters.appearingFor !== 'all' || caseViewFilters.advocateName) {
      let filterText = "Filters: ";
      if (caseViewFilters.clientName) filterText += `Client: ${caseViewFilters.clientName} `;
      if (caseViewFilters.appearingFor !== 'all') filterText += `Appearing For: ${caseViewFilters.appearingFor} `;
      if (caseViewFilters.advocateName) filterText += `Advocate: ${caseViewFilters.advocateName}`;
      doc.text(filterText, 14, 28);
    }

    const tableData: any[] = [];
    sortedScheduleDates.forEach(date => {
      tableData.push([{ content: formatDate(date), colSpan: 5, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
      casesByScheduleDate[date].forEach(c => {
        tableData.push([
          c.case_number,
          c.client_name,
          c.appearing_for || '-',
          c.stage,
          c.court
        ]);
      });
    });

    autoTable(doc, {
      head: [['Case Number', 'Client Name', 'Appearing For', 'Stage', 'Court']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 30, 62] },
    });
    doc.save("case_view_schedule.pdf");
  };

  const exportCaseAllotmentPDF = () => {
    const doc = new jsPDF();
    const allotmentCases = cases
      .filter(c => allotmentFilters.year === '' || c.case_year === allotmentFilters.year)
      .filter(c => allotmentFilters.client === '' || c.client_name.toLowerCase().includes(allotmentFilters.client.toLowerCase()))
      .filter(c => allotmentFilters.appearingFor === 'all' || c.appearing_for === allotmentFilters.appearingFor);

    const tableData = allotmentCases.map(c => [
      c.client_name,
      c.case_number,
      c.case_year || '-',
      c.appearing_for || '-',
      c.court
    ]);

    doc.setFontSize(18);
    doc.text("Case Allotment Details", 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    autoTable(doc, {
      head: [['Client Name', 'Case Number', 'Year', 'Appearing For', 'Court']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 30, 62] },
    });

    doc.save(`case_allotment_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const updateCase = async (id: number, updates: Partial<Case>) => {
    try {
      const currentCase = cases.find(c => c.id === id);
      if (!currentCase) return;

      const fullUpdates = { ...currentCase, ...updates };
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullUpdates)
      });
      if (res.ok) {
        await fetchCases();
        showNotification('Case updated successfully!');
      } else {
        let errorMsg = 'Unknown error';
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorData = await res.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } else {
            errorMsg = await res.text();
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        showNotification(`Failed to update case: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('Error updating case:', err);
      showNotification(`An unexpected error occurred: ${err.message || 'Check console for details'}`, 'error');
    }
  };

  const deleteCase = async (id: number | string) => {
    if (!id) {
      console.error('Cannot delete case: ID is missing');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete this case?`)) return;
    
    try {
      const res = await fetch(`/api/cases/${id}`, { 
        method: 'DELETE'
      });
      
      if (res.ok) {
        await fetchCases();
        showNotification('Case deleted successfully');
      } else {
        const error = await res.json();
        showNotification(`Failed to delete case: ${error.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error deleting case:', err);
      showNotification('Failed to delete case. Please check your connection.', 'error');
    }
  };

  const handleFilingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForFiling) return;
    
    try {
      const res = await fetch(`/api/cases/${selectedCaseForFiling}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cases.find(c => c.id === selectedCaseForFiling), ...filingFormData })
      });
      if (res.ok) {
        setFilingFormData({
          filing_details: '',
          filed_on: '',
          ref_number: '',
          cf_number: '',
          filing_other: ''
        });
        setSelectedCaseForFiling(null);
        await fetchCases();
        showNotification('Filing details saved successfully!');
        setView('filing_view');
      }
    } catch (err) {
      console.error('Error saving filing details:', err);
    }
  };

  const filteredCases = cases.filter(c => 
    c.case_number.toLowerCase().includes(search.toLowerCase()) ||
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.court.toLowerCase().includes(search.toLowerCase())
  );

  const awardPassedCases = cases.filter(c => c.stage === 'Award Passed').filter(c => {
    if (awardFilter.pendingCopyApp && c.copy_app_filed_date) return false;
    if (awardFilter.copyReceived && !c.award_copy_received) return false;
    if (awardFilter.legalOpinion && !c.legal_opinion_given) return false;
    if (awardFilter.amountReceived && !c.amount_received) return false;
    if (awardFilter.receiptSent && !c.receipt_sent) return false;
    return true;
  });

  const casesByScheduleDate = cases
    .filter(c => {
      if (caseViewFilters.clientName && !c.client_name.toLowerCase().includes(caseViewFilters.clientName.toLowerCase())) return false;
      if (caseViewFilters.appearingFor !== 'all' && c.appearing_for !== caseViewFilters.appearingFor) return false;
      if (caseViewFilters.caseYear && c.case_year !== caseViewFilters.caseYear) return false;
      if (caseViewFilters.advocateName && 
          !c.petitioner_advocate?.toLowerCase().includes(caseViewFilters.advocateName.toLowerCase()) && 
          !c.counsel_other_side?.toLowerCase().includes(caseViewFilters.advocateName.toLowerCase())) return false;
      return true;
    })
    .reduce((groups, c) => {
    const dates = new Set<string>();
    if (c.next_posting_date) dates.add(getRawDate(c.next_posting_date));
    if (c.hearing_date) dates.add(getRawDate(c.hearing_date));
    
    dates.forEach(date => {
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(c);
    });
    return groups;
  }, {} as Record<string, Case[]>);

  const sortedScheduleDates = Object.keys(casesByScheduleDate)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .filter(date => !selectedViewDate || date === selectedViewDate);

  return (
    <div className="min-h-screen bg-legal-cream text-legal-ink font-sans">
      {/* Error Banner */}
      <AnimatePresence>
        {dbError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border-b border-red-200 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Database Connection Error</p>
                  <p className="text-sm opacity-90">{dbError}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchCases()}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            style={{ left: '50%' }}
            className={`fixed bottom-8 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-rose-500 text-white border-rose-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
              <XCircle size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r border-legal-navy/10 p-6 z-10 flex flex-col shadow-sm">
        <div className="flex items-center gap-3 mb-10 px-2 shrink-0">
          <div className="w-10 h-10 bg-legal-navy rounded-xl flex items-center justify-center text-white shadow-md">
            <Scale size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-legal-navy serif">AdvocatePro</h1>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setView('award_passed')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'award_passed' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <Trophy size={20} />
            Award Passed
          </button>
          <button 
            onClick={() => setView('case_view')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'case_view' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <CalendarDays size={20} />
            Case View
          </button>
          <button 
            onClick={() => setView('filing_entry')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'filing_entry' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <CheckSquare size={20} />
            Filing Entry
          </button>
          <button 
            onClick={() => setView('filing_view')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'filing_view' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <FileText size={20} />
            View Filing
          </button>
          <button 
            onClick={() => setView('fit_cases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'fit_cases' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <CheckCircle2 size={20} />
            Fit Cases
          </button>
          <button 
            onClick={() => setView('connected_cases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'connected_cases' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <Link size={20} />
            Connected Cases
          </button>
          <button 
            onClick={() => setView('case_allotment')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'case_allotment' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <Briefcase size={20} />
            Case Allotment
          </button>
          <button 
            onClick={() => setView('remarkable_cases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'remarkable_cases' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <Trophy size={20} />
            Remarkable Cases
          </button>

          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registers</p>
          </div>
          <button 
            onClick={() => setView('ioregister')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'ioregister' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <ClipboardList size={20} />
            IO Register
          </button>
          <button 
            onClick={() => setView('work_allocation')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'work_allocation' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <Briefcase size={20} />
            Work Allocation
          </button>
          <button 
            onClick={() => setView('pending_work')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'pending_work' ? 'bg-legal-navy text-white font-semibold shadow-md' : 'text-legal-slate hover:bg-legal-navy/5'}`}
          >
            <Clock size={20} />
            Pending Work
          </button>

          <button 
            onClick={() => setView('priority_entry')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'priority_entry' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <AlertCircle size={20} />
            Priority Cases
          </button>
          <button 
            onClick={() => setView('priority_view')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'priority_view' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <FileText size={20} />
            View Priority
          </button>

          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Staff Management</p>
          </div>
          <button 
            onClick={() => setView('staff_entry')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'staff_entry' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Users size={20} />
            Staff Entry
          </button>
          <button 
            onClick={() => setView('attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'attendance' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Clock3 size={20} />
            Attendance
          </button>
          <button 
            onClick={() => setView('view_attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'view_attendance' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ClipboardList size={20} />
            View Attendance
          </button>

          <button 
            onClick={() => setView('master')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'master' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Database size={20} />
            Master
          </button>

          <button 
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Settings size={20} />
            Settings
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData(initialFormData);
              setView('entry');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'entry' ? 'bg-legal-navy/5 text-legal-navy font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Plus size={20} />
            Case Entry
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 shrink-0">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Active Cases</p>
            <p className="text-2xl font-bold text-legal-navy">{cases.length}</p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-64 p-10">
        <AnimatePresence mode="wait">
          {dbStatus?.status === 'error' && view !== 'settings' ? (
            <motion.div
              key="setup-required"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-[2rem] p-12 border border-legal-navy/10 shadow-2xl text-center">
                <div className="w-20 h-20 bg-legal-navy/5 rounded-3xl flex items-center justify-center text-legal-navy mx-auto mb-8">
                  <AlertCircle size={48} />
                </div>
                <h2 className="text-4xl font-black text-legal-navy mb-4 serif">Database Setup Required</h2>
                <p className="text-xl text-legal-slate mb-10 max-w-2xl mx-auto">
                  It looks like some required tables are missing from your Supabase database. 
                  You need to create them before you can use AdvocatePro.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                  {Object.entries(dbStatus.tables || {}).map(([table, info]: [string, any]) => (
                    <div key={table} className={`p-4 rounded-2xl border ${info.status === 'ok' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {info.status === 'ok' ? <Check size={16} /> : <XCircle size={16} />}
                        <span className="font-bold uppercase text-[10px] tracking-widest">{table}</span>
                      </div>
                      <p className="text-xs font-medium">{info.status === 'ok' ? 'Ready' : 'Missing'}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => setView('settings')}
                    className="w-full bg-legal-navy text-white py-5 rounded-2xl font-bold text-xl hover:bg-opacity-90 transition-all shadow-xl shadow-legal-navy/20 flex items-center justify-center gap-3"
                  >
                    <Settings size={24} />
                    Go to Database Settings
                  </button>
                  <button 
                    onClick={() => checkDatabase()}
                    className="w-full bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Search size={20} />
                    Refresh Status
                  </button>
                </div>
              </div>
            </motion.div>
          ) : view === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Case Dashboard</h2>
                  <p className="text-legal-slate">Manage and track your active legal proceedings.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingId(null);
                    setFormData(initialFormData);
                    setView('entry');
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-legal-navy text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-legal-navy/20"
                >
                  <Plus size={18} />
                  New Case
                </button>
              </div>

              <div className="mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search cases, clients, or courts..."
                    className="pl-12 pr-6 py-3 bg-white border border-legal-navy/10 rounded-2xl w-80 focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all shadow-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-legal-navy"></div>
                </div>
              ) : filteredCases.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredCases.map((c) => (
                    <motion.div 
                      key={c.id}
                      layout
                      className="bg-white rounded-3xl p-6 border border-legal-navy/5 shadow-sm hover:shadow-md transition-shadow group relative"
                    >
                      <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditing(c);
                          }}
                          className="p-2 text-gray-400 hover:text-legal-navy transition-colors bg-gray-50 rounded-lg"
                          title="Edit Case"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteCase(c.id);
                          }}
                          className="flex items-center gap-1 p-2 text-gray-400 hover:text-white hover:bg-legal-burgundy transition-all bg-gray-50 rounded-lg"
                          title="Delete Case"
                        >
                          <Trash2 size={18} />
                          <span className="text-[10px] font-bold uppercase pr-1">Delete</span>
                        </button>
                      </div>

                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-legal-navy/5 rounded-2xl flex items-center justify-center text-legal-navy">
                          <Briefcase size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-legal-navy uppercase tracking-widest">
                              {c.stage === 'Other' ? c.other_details || 'Other' : c.stage}
                            </span>
                            {c.case_type && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs font-bold text-legal-burgundy uppercase tracking-widest">
                                  {c.case_type}
                                </span>
                              </>
                            )}
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={12} />
                              {c.stage === 'Hearing' && c.hearing_date ? `Hearing: ${formatDate(c.hearing_date)}` : 
                               c.stage === 'Disposed' && c.disposed_date ? `Disposed: ${formatDate(c.disposed_date)}` :
                               formatDate(c.created_at)}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-legal-ink serif">{c.case_number}</h3>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mb-6">
                        {c.hearing_date && (
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-700">
                            <Clock size={18} />
                            <span className="text-sm font-bold">Hearing Date: {formatDate(c.hearing_date)}</span>
                          </div>
                        )}
                        {c.next_posting_date && (
                          <div className="p-3 bg-legal-gold/5 border border-legal-gold/20 rounded-2xl flex items-center gap-3 text-legal-gold">
                            <Calendar size={18} />
                            <span className="text-sm font-bold">Next Posting: {formatDate(c.next_posting_date)}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-700">{c.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Scale size={16} className="text-gray-400" />
                            <span className="truncate">{c.court}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="text-gray-700 font-medium">{c.file_location}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                    <Search size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No cases found</h3>
                  <p className="text-gray-500 mb-6 max-w-xs">Try adjusting your search or add a new case to get started.</p>
                  <button 
                    onClick={() => setView('entry')}
                    className="bg-legal-navy text-white px-6 py-3 rounded-xl font-semibold hover:bg-legal-navy/90 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Add Your First Case
                  </button>
                </div>
              )}
            </motion.div>
          ) : view === 'award_passed' ? (
            <motion.div
              key="award_passed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Award Passed Cases</h2>
                  <p className="text-legal-slate">Track post-award documentation and payments.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={exportAwardPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl hover:bg-legal-navy/90 transition-all shadow-sm font-bold text-sm"
                  >
                    <Download size={16} />
                    Export PDF
                  </button>
                  <div className="bg-white p-4 rounded-2xl border border-legal-navy/10 shadow-sm flex flex-wrap gap-4 items-center">
                    <span className="text-xs font-bold text-legal-slate uppercase flex items-center gap-2">
                      <Filter size={14} />
                      Quick Filters:
                    </span>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-legal-navy transition-colors">
                      <input 
                        type="checkbox" 
                        checked={awardFilter.pendingCopyApp}
                        onChange={(e) => setAwardFilter({...awardFilter, pendingCopyApp: e.target.checked})}
                        className="rounded text-legal-navy focus:ring-legal-navy"
                      />
                      Pending Copy App
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-legal-navy transition-colors">
                      <input 
                        type="checkbox" 
                        checked={awardFilter.copyReceived}
                        onChange={(e) => setAwardFilter({...awardFilter, copyReceived: e.target.checked})}
                        className="rounded text-legal-navy focus:ring-legal-navy"
                      />
                      Copy Received
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-legal-navy transition-colors">
                      <input 
                        type="checkbox" 
                        checked={awardFilter.legalOpinion}
                        onChange={(e) => setAwardFilter({...awardFilter, legalOpinion: e.target.checked})}
                        className="rounded text-legal-navy focus:ring-legal-navy"
                      />
                      Legal Opinion
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-legal-navy transition-colors">
                      <input 
                        type="checkbox" 
                        checked={awardFilter.amountReceived}
                        onChange={(e) => setAwardFilter({...awardFilter, amountReceived: e.target.checked})}
                        className="rounded text-legal-navy focus:ring-legal-navy"
                      />
                      Amount Received
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-legal-navy transition-colors">
                      <input 
                        type="checkbox" 
                        checked={awardFilter.receiptSent}
                        onChange={(e) => setAwardFilter({...awardFilter, receiptSent: e.target.checked})}
                        className="rounded text-legal-navy focus:ring-legal-navy"
                      />
                      Receipt Sent
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-legal-navy/10 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1400px]">
                  <thead>
                    <tr className="bg-legal-parchment border-b border-legal-navy/10">
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-32">Case Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-48">Client Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-40">Award Passed On</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-48">Copy App Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-48">Award Copy Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-48">Legal Opinion Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-48">Payment Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest w-48">Receipt Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest text-center w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-legal-navy/5">
                    {awardPassedCases.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{c.case_number}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-700 truncate max-w-[180px]" title={c.client_name}>{c.client_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={14} className="text-gray-400" />
                            <input 
                              type="date"
                              className="bg-transparent border-none focus:ring-0 p-0 text-sm"
                              value={getRawDate(c.award_passed_date)}
                              onChange={(e) => updateCase(c.id, { award_passed_date: e.target.value })}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileText size={14} className="text-gray-400" />
                              <input 
                                type="date"
                                className="bg-transparent border-none focus:ring-0 p-0 text-sm"
                                value={getRawDate(c.copy_app_filed_date)}
                                onChange={(e) => updateCase(c.id, { copy_app_filed_date: e.target.value })}
                              />
                            </div>
                            {!c.copy_app_filed_date && (
                              <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded w-fit">Copy application pending</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar size={14} className="text-gray-400" />
                              <input 
                                type="date"
                                className="bg-transparent border-none focus:ring-0 p-0 text-sm"
                                value={getRawDate(c.ca_received_date)}
                                onChange={(e) => updateCase(c.id, { ca_received_date: e.target.value })}
                              />
                            </div>
                            {!c.ca_received_date ? (
                              <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded w-fit">Award copy not received</span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded w-fit">Award copy received</span>
                            )}
                            <button 
                              onClick={() => updateCase(c.id, { award_copy_received: c.award_copy_received ? 0 : 1 })}
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md w-fit transition-all border ${c.award_copy_received ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                            >
                              {c.award_copy_received ? 'Received' : 'Mark Received'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar size={14} className="text-gray-400" />
                              <input 
                                type="date"
                                className="bg-transparent border-none focus:ring-0 p-0 text-sm"
                                value={getRawDate(c.legal_opinion_sent_date)}
                                onChange={(e) => updateCase(c.id, { legal_opinion_sent_date: e.target.value })}
                              />
                            </div>
                            {!c.legal_opinion_sent_date ? (
                              <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded w-fit">legal opinion pending</span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded w-fit">legal opinion sent</span>
                            )}
                            <button 
                              onClick={() => updateCase(c.id, { legal_opinion_given: c.legal_opinion_given ? 0 : 1 })}
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md w-fit transition-all border ${c.legal_opinion_given ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                            >
                              {c.legal_opinion_given ? 'Opinion Given' : 'Give Opinion'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => updateCase(c.id, { amount_received: c.amount_received ? 0 : 1 })}
                            className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all border w-full text-center ${c.amount_received ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'}`}
                          >
                            {c.amount_received ? 'amount is paid' : 'Amount not paid by company'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => updateCase(c.id, { receipt_sent: c.receipt_sent ? 0 : 1 })}
                            className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all border w-full text-center ${c.receipt_sent ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'}`}
                          >
                            {c.receipt_sent ? 'receipt sent' : 'receipt not sent'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteCase(c.id);
                            }}
                            className="flex items-center gap-1 p-2 text-gray-400 hover:text-white hover:bg-legal-burgundy transition-all bg-gray-50 rounded-lg mx-auto"
                            title="Delete Case"
                          >
                            <Trash2 size={18} />
                            <span className="text-[10px] font-bold uppercase pr-1">Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {awardPassedCases.length === 0 && (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <Trophy size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No award passed cases</h3>
                    <p className="text-gray-500 max-w-xs">Cases marked as "Award Passed" will appear here for further tracking.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'filing_entry' ? (
            <motion.div
              key="filing_entry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight mb-2">Filing Details Entry</h2>
                <p className="text-gray-500">Add filing information for existing cases.</p>
              </div>

              <form onSubmit={handleFilingSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Hash size={14} />
                    Select Case Number
                  </label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                    value={selectedCaseForFiling || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedCaseForFiling(id);
                      const c = cases.find(x => x.id === id);
                      if (c) {
                        setFilingFormData({
                          filing_details: c.filing_details || '',
                          filed_on: c.filed_on || '',
                          ref_number: c.ref_number || '',
                          cf_number: c.cf_number || '',
                          filing_other: c.filing_other || ''
                        });
                      }
                    }}
                  >
                    <option value="">-- Select Case --</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.case_number} - {c.client_name}</option>
                    ))}
                  </select>
                </div>

                {selectedCaseForFiling && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 pt-6 border-t border-gray-100"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Filing Details</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all min-h-[100px]"
                        placeholder="Enter filing details..."
                        value={filingFormData.filing_details}
                        onChange={(e) => setFilingFormData({...filingFormData, filing_details: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Filed On</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          value={filingFormData.filed_on}
                          onChange={(e) => setFilingFormData({...filingFormData, filed_on: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Ref Number</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          placeholder="Reference No."
                          value={filingFormData.ref_number}
                          onChange={(e) => setFilingFormData({...filingFormData, ref_number: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">CF Number</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          placeholder="CF No."
                          value={filingFormData.cf_number}
                          onChange={(e) => setFilingFormData({...filingFormData, cf_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Other</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          placeholder="Additional info"
                          value={filingFormData.filing_other}
                          onChange={(e) => setFilingFormData({...filingFormData, filing_other: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        className="w-full bg-legal-navy text-white py-4 rounded-2xl font-bold text-lg hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={24} />
                        Save Filing Details
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            </motion.div>
          ) : view === 'filing_view' ? (
            <motion.div
              key="filing_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">View Filing Details</h2>
                  <p className="text-legal-slate">Browse filing information for all cases.</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex flex-col gap-1 pr-4 border-r border-gray-100">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} />
                        Filing Date
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="date"
                          className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy"
                          value={filingFilters.date}
                          onChange={(e) => setFilingFilters({...filingFilters, date: e.target.value})}
                        />
                        {filingFilters.date && (
                          <button 
                            onClick={() => setFilingFilters({...filingFilters, date: ''})}
                            className="text-gray-400 hover:text-legal-burgundy transition-colors"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-legal-navy transition-colors">
                        <input 
                          type="checkbox" 
                          checked={filingFilters.refNill}
                          onChange={(e) => setFilingFilters({...filingFilters, refNill: e.target.checked})}
                          className="rounded text-legal-navy focus:ring-legal-navy"
                        />
                        Ref No = NILL
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-legal-navy transition-colors">
                        <input 
                          type="checkbox" 
                          checked={filingFilters.cfNill}
                          onChange={(e) => setFilingFilters({...filingFilters, cfNill: e.target.checked})}
                          className="rounded text-legal-navy focus:ring-legal-navy"
                        />
                        CF No = NILL
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search by case number..."
                      className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl w-80 focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all shadow-sm"
                      value={filingSearch}
                      onChange={(e) => setFilingSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Filing Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Filed On</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Ref No.</th>
                       <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">CF No.</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Other</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cases
                      .filter(c => c.filing_details || c.filed_on || c.ref_number || c.cf_number)
                      .filter(c => c.case_number.toLowerCase().includes(filingSearch.toLowerCase()))
                      .filter(c => !filingFilters.date || getRawDate(c.filed_on) === filingFilters.date)
                      .filter(c => !filingFilters.refNill || !c.ref_number || c.ref_number.toLowerCase() === 'nill' || c.ref_number.trim() === '')
                      .filter(c => !filingFilters.cfNill || !c.cf_number || c.cf_number.toLowerCase() === 'nill' || c.cf_number.trim() === '')
                      .map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{c.case_number}</div>
                          <div className="text-xs text-gray-400">{c.client_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate" title={c.filing_details}>
                            {c.filing_details || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {c.filed_on ? formatDate(c.filed_on) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{c.ref_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{c.cf_number || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{c.filing_other || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteCase(c.id);
                            }}
                            className="flex items-center gap-1 p-2 text-gray-400 hover:text-white hover:bg-legal-burgundy transition-all bg-gray-50 rounded-lg mx-auto"
                            title="Delete Case"
                          >
                            <Trash2 size={18} />
                            <span className="text-[10px] font-bold uppercase pr-1">Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cases.filter(c => c.filing_details || c.filed_on || c.ref_number || c.cf_number).length === 0 && (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No filing details recorded</h3>
                    <p className="text-gray-500 max-w-xs">Use the "Filing Entry" page to add filing information for your cases.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'fit_cases' ? (
            <motion.div
              key="fit_cases"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Fit Cases</h2>
                  <p className="text-legal-slate">Cases with a high chance for settlement.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-legal-navy/10 shadow-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Filter by Client..."
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 w-48"
                      value={fitCasesSearch.clientName}
                      onChange={(e) => setFitCasesSearch({...fitCasesSearch, clientName: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Filter by Advocate..."
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 w-48"
                      value={fitCasesSearch.petitionerAdvocate}
                      onChange={(e) => setFitCasesSearch({...fitCasesSearch, petitionerAdvocate: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <select 
                      className="pl-4 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 appearance-none cursor-pointer"
                      value={fitCasesSearch.caseType}
                      onChange={(e) => setFitCasesSearch({...fitCasesSearch, caseType: e.target.value})}
                    >
                      <option value="">All Types</option>
                      <option value="Injury">Injury</option>
                      <option value="Death">Death</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="relative">
                    <select 
                      className="pl-4 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 appearance-none cursor-pointer"
                      value={fitCasesSearch.appearingFor}
                      onChange={(e) => setFitCasesSearch({...fitCasesSearch, appearingFor: e.target.value})}
                    >
                      <option value="all">All Appearing For</option>
                      <option value="Petitioner">Petitioner</option>
                      <option value="Respondent">Respondent</option>
                      <option value="Company">Company</option>
                      <option value="R2">R2</option>
                      <option value="R3">R3</option>
                      <option value="R4">R4</option>
                      <option value="R5">R5</option>
                    </select>
                  </div>
                  <button 
                    onClick={exportFitCasesPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all shadow-sm ml-2"
                  >
                    <Download size={14} />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stage</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Petitioner Advocate</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Court</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cases
                      .filter(c => c.chance_for_settlement === 1)
                      .filter(c => c.stage !== 'Award Passed' && c.stage !== 'Disposed')
                      .filter(c => c.client_name.toLowerCase().includes(fitCasesSearch.clientName.toLowerCase()))
                      .filter(c => (c.petitioner_advocate || '').toLowerCase().includes(fitCasesSearch.petitionerAdvocate.toLowerCase()))
                      .filter(c => fitCasesSearch.caseType === '' || c.case_type === fitCasesSearch.caseType)
                      .filter(c => fitCasesSearch.appearingFor === 'all' || c.appearing_for === fitCasesSearch.appearingFor)
                      .map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{c.case_number}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-700">{c.client_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            c.case_type === 'Injury' ? 'bg-orange-50 text-orange-600' :
                            c.case_type === 'Death' ? 'bg-red-50 text-red-600' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {c.case_type || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{c.stage || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{c.petitioner_advocate || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{c.court}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteCase(c.id);
                            }}
                            className="flex items-center gap-1 p-2 text-gray-400 hover:text-white hover:bg-legal-burgundy transition-all bg-gray-50 rounded-lg mx-auto"
                            title="Delete Case"
                          >
                            <Trash2 size={18} />
                            <span className="text-[10px] font-bold uppercase pr-1">Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cases.filter(c => c.chance_for_settlement === 1).length === 0 && (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No fit cases found</h3>
                    <p className="text-gray-500 max-w-xs">Cases marked with "Chance for Settlement = Yes" in Case Entry will appear here.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'connected_cases' ? (
            <motion.div
              key="connected_cases"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Connected Case Details</h2>
                <p className="text-gray-500">View relationships between connected legal proceedings.</p>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Connected To</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stage</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Court</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cases
                      .filter(c => c.is_connected === 1)
                      .map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{c.case_number}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-700">{c.client_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-legal-navy font-semibold">
                            <Link size={14} />
                            {c.connected_case_number || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-legal-navy/5 text-legal-navy text-[10px] font-bold uppercase tracking-wider rounded-md">
                            {c.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{c.court}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cases.filter(c => c.is_connected === 1).length === 0 && (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <Link size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No connected cases found</h3>
                    <p className="text-gray-500 max-w-xs">Cases marked with "Connected Cases = Yes" in Case Entry will appear here.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'priority_entry' ? (
            <motion.div
              key="priority_entry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-10">
                <button 
                  onClick={() => setView('dashboard')}
                  className="text-gray-400 hover:text-gray-600 flex items-center gap-2 mb-4 transition-colors"
                >
                  <ChevronRight size={20} className="rotate-180" />
                  Back to Dashboard
                </button>
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  {editingId ? 'Edit Priority Case' : 'Priority Case Entry'}
                </h2>
                <p className="text-gray-500">
                  Set reminders for important cases that need immediate attention.
                </p>
              </div>

              <form onSubmit={handlePrioritySubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Hash size={14} />
                    Case Number
                  </label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                    value={priorityFormData.case_number}
                    onChange={(e) => setPriorityFormData({...priorityFormData, case_number: e.target.value})}
                  >
                    <option value="">Select Case Number</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.case_number}>{c.case_number} - {c.client_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <FileText size={14} />
                    Purpose
                  </label>
                  <textarea 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all min-h-[100px]"
                    placeholder="Why is this case a priority?"
                    value={priorityFormData.purpose}
                    onChange={(e) => setPriorityFormData({...priorityFormData, purpose: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={14} />
                      Remind On
                    </label>
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      value={getRawDate(priorityFormData.remind_on)}
                      onChange={(e) => setPriorityFormData({...priorityFormData, remind_on: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Status
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={priorityFormData.status}
                      onChange={(e) => setPriorityFormData({...priorityFormData, status: e.target.value as 'pending' | 'completed'})}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-legal-navy text-white py-4 rounded-2xl font-bold text-lg hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10 flex items-center justify-center gap-2"
                  >
                    {editingId ? <CheckCircle2 size={24} /> : <Plus size={24} />}
                    {editingId ? 'Update Priority Case' : 'Save Priority Case'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : view === 'priority_view' ? (
            <motion.div
              key="priority_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-bold tracking-tight text-legal-navy mb-2 serif">Priority Cases</h2>
                  <p className="text-gray-500">View and manage cases that require immediate attention.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={exportPriorityPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-legal-navy text-white rounded-2xl font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10"
                  >
                    <Download size={18} />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Client Filter</label>
                    <input 
                      type="text"
                      placeholder="Search Client..."
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20"
                      value={priorityFilters.clientName}
                      onChange={(e) => setPriorityFilters({...priorityFilters, clientName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Filter</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20"
                      value={priorityFilters.status}
                      onChange={(e) => setPriorityFilters({...priorityFilters, status: e.target.value as any})}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date Range</label>
                    <select 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20"
                      value={priorityFilters.dateRange}
                      onChange={(e) => setPriorityFilters({...priorityFilters, dateRange: e.target.value as any})}
                    >
                      <option value="all">All Dates</option>
                      <option value="10">Next 10 Days</option>
                      <option value="15">Next 15 Days</option>
                      <option value="custom">Particular Date</option>
                    </select>
                  </div>
                  {priorityFilters.dateRange === 'custom' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Date</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20"
                        value={priorityFilters.customDate}
                        onChange={(e) => setPriorityFilters({...priorityFilters, customDate: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case Number</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Next Posting</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Purpose</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Remind On</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredPriorityCases().length > 0 ? (
                        getFilteredPriorityCases().map(pc => {
                          const caseObj = cases.find(c => c.case_number === pc.case_number);
                          return (
                          <tr key={pc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                            <td className="py-4 px-4">
                              <span className="font-bold text-gray-900">{pc.case_number}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm font-medium text-gray-700">{caseObj?.client_name || '-'}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm font-bold text-legal-gold">{caseObj?.next_posting_date ? formatDate(caseObj.next_posting_date) : '-'}</span>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-gray-600 max-w-md">{pc.purpose}</p>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar size={14} />
                                <span className="font-medium">{formatDate(pc.remind_on)}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <button 
                                onClick={() => handlePriorityStatusToggle(pc)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  pc.status === 'completed' 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                              >
                                {pc.status}
                              </button>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    setEditingId(pc.id);
                                    setPriorityFormData({
                                      case_number: pc.case_number || '',
                                      purpose: pc.purpose || '',
                                      remind_on: pc.remind_on || '',
                                      status: pc.status || 'pending'
                                    });
                                    setView('priority_entry');
                                  }}
                                  className="p-2 text-gray-400 hover:text-legal-navy transition-colors bg-gray-50 rounded-lg"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => handlePriorityDelete(pc.id)}
                                  className="p-2 text-gray-400 hover:text-legal-burgundy transition-colors bg-gray-50 rounded-lg"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-400">
                              <AlertCircle size={48} className="mb-4 opacity-20" />
                              <p className="text-lg font-medium">No priority cases found</p>
                              <p className="text-sm">Try adjusting your filters or add a new priority case.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : view === 'master' ? (
            <motion.div
              key="master"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Master Management</h2>
                <p className="text-gray-500">Manage reference data for your legal practice.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                  <div className="bg-white p-8 rounded-3xl border border-legal-navy/10 shadow-sm sticky top-24">
                    <h3 className="text-xl font-bold text-legal-ink mb-6 serif">Add New Entry</h3>
                    <form onSubmit={handleMasterSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Category</label>
                        <select 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          value={masterFormData.category}
                          onChange={(e) => setMasterFormData({...masterFormData, category: e.target.value as any})}
                        >
                          <option value="Advocate">Advocate</option>
                          <option value="Client">Client</option>
                          <option value="Court">Court</option>
                          <option value="Case Category">Case Category</option>
                          <option value="Shelf">Shelf</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">
                          {masterFormData.category} Name
                        </label>
                        <input 
                          type="text"
                          placeholder={`Enter ${masterFormData.category.toLowerCase()} name`}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          value={masterFormData.name}
                          onChange={(e) => setMasterFormData({...masterFormData, name: e.target.value})}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          type="submit"
                          className="flex-1 bg-legal-navy text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <Check size={20} />
                          Save Entry
                        </button>
                        <button 
                          type="button"
                          onClick={resetMasterForm}
                          className="px-6 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center"
                          title="Reset Form"
                        >
                          <RotateCcw size={20} />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-3xl border border-legal-navy/10 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-legal-navy serif">Existing Entries</h3>
                      <div className="flex gap-2">
                        {['Advocate', 'Client', 'Court', 'Case Category', 'Shelf'].map(cat => (
                          <span key={cat} className="text-[10px] font-bold px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-500 uppercase">
                            {masters.filter(m => m.category === cat).length} {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-legal-parchment/30 border-b border-legal-navy/10">
                            <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest">Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-legal-slate uppercase tracking-widest">Added On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-legal-navy/5">
                          {masters.length > 0 ? (
                            masters.map(m => (
                              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                                    m.category === 'Advocate' ? 'bg-blue-50 text-blue-600' :
                                    m.category === 'Client' ? 'bg-purple-50 text-purple-600' :
                                    m.category === 'Court' ? 'bg-amber-50 text-amber-600' :
                                    m.category === 'Case Category' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-gray-50 text-gray-600'
                                  }`}>
                                    {m.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900">{m.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-xs text-gray-500">{formatDate(m.created_at)}</div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                  <Database size={40} className="opacity-20" />
                                  <p>No master entries found. Add your first entry to get started.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Settings</h2>
                <p className="text-gray-500">Configure your application and cloud backups.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-legal-navy/10 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-legal-navy/5 rounded-2xl flex items-center justify-center text-legal-navy">
                      <Cloud size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-legal-ink serif">Google Drive Backup</h3>
                      <p className="text-sm text-legal-slate">Securely backup your case data to the cloud.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-legal-parchment/50 rounded-2xl border border-legal-navy/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${googleDriveConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-sm font-medium text-gray-700">
                          {googleDriveConnected ? 'Connected to Google Drive' : 'Not Connected'}
                        </span>
                      </div>
                      {!googleDriveConnected && (
                        <button 
                          onClick={connectGoogleDrive}
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    {googleDriveConnected && (
                      <div className="space-y-4">
                        <button 
                          onClick={performBackup}
                          disabled={backingUp}
                          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-legal-navy text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-md disabled:opacity-50"
                        >
                          {backingUp ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Download size={20} />
                          )}
                          {backingUp ? 'Backing up...' : 'Backup Now'}
                        </button>

                        {backupStatus && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-2xl flex items-center gap-3 ${backupStatus.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                          >
                            {backupStatus.success ? <Check size={18} /> : <AlertCircle size={18} />}
                            <span className="text-sm font-medium">{backupStatus.message}</span>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-legal-navy/10 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-legal-gold/10 rounded-2xl flex items-center justify-center text-legal-gold">
                      <FileSpreadsheet size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-legal-ink serif">Excel Database Sync</h3>
                      <p className="text-sm text-legal-slate">Import or export your database as an Excel file.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={exportExcel}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                      >
                        <Download size={18} />
                        Export Excel
                      </button>
                      
                      <label className="flex items-center justify-center gap-2 px-4 py-3 bg-legal-navy text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-md cursor-pointer">
                        {importingExcel ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Upload size={18} />
                        )}
                        {importingExcel ? 'Importing...' : 'Import Excel'}
                        <input 
                          type="file" 
                          accept=".xlsx, .xls" 
                          className="hidden" 
                          onChange={importExcel}
                          disabled={importingExcel}
                        />
                      </label>
                    </div>

                    {excelStatus && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 ${excelStatus.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                      >
                        {excelStatus.success ? <Check size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-medium">{excelStatus.message}</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                      <Scale size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Database Status</h3>
                      <p className="text-sm text-gray-500">Check if all required tables are present in Supabase.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={checkDatabase}
                      disabled={checkingDb}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50"
                    >
                      {checkingDb ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      {checkingDb ? 'Checking...' : 'Check Database Tables'}
                    </button>

                    {dbStatus && (
                      <div className="space-y-2">
                        {Object.entries(dbStatus.tables || {}).map(([table, info]: [string, any]) => (
                          <div key={table} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-sm font-bold text-gray-700 capitalize">{table}</span>
                            <div className="flex items-center gap-2">
                              {info.status === 'ok' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-600">
                                  <Check size={12} /> Ready
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-600" title={info.message}>
                                  <AlertCircle size={12} /> Missing
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {dbStatus.status === 'error' && (
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mt-4">
                            <div className="text-xs text-red-700 font-medium">
                              Some tables are missing. Please ensure you have created the following tables in your Supabase project:
                              <div className="relative group/sql">
                                <code className="block mt-2 p-2 bg-red-100 rounded text-[10px] whitespace-pre-wrap">
                                  {`-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS cases (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  case_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  court TEXT NOT NULL,
  file_location TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  award_passed_date DATE,
  copy_app_filed_date DATE,
  award_copy_received INTEGER DEFAULT 0,
  legal_opinion_given INTEGER DEFAULT 0,
  amount_received INTEGER DEFAULT 0,
  receipt_sent INTEGER DEFAULT 0,
  disposed_date DATE,
  hearing_date DATE,
  other_details TEXT,
  next_posting_date DATE,
  filing_details TEXT,
  filed_on DATE,
  ref_number TEXT,
  cf_number TEXT,
  filing_other TEXT,
  petitioner_advocate TEXT,
  chance_for_settlement INTEGER DEFAULT 0,
  ca_received_date DATE,
  legal_opinion_sent_date DATE,
  case_type TEXT DEFAULT 'Other',
  is_connected INTEGER DEFAULT 0,
  connected_case_number TEXT,
  counsel_other_side TEXT,
  appearing_for TEXT,
  remarkable_case TEXT DEFAULT 'No',
  remarkable_comments TEXT,
  case_year TEXT,
  ws_filed TEXT DEFAULT 'No',
  investigation_received TEXT DEFAULT 'No'
);

-- Run these if you already have the cases table but are missing columns:
ALTER TABLE cases ADD COLUMN IF NOT EXISTS remarkable_case TEXT DEFAULT 'No';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS remarkable_comments TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_year TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS ws_filed TEXT DEFAULT 'No';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS investigation_received TEXT DEFAULT 'No';

-- For ioregister table:
ALTER TABLE ioregister ADD COLUMN IF NOT EXISTS case_year TEXT;

CREATE TABLE IF NOT EXISTS priority (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  case_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  remind_on DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staff_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  mobile_number TEXT,
  address TEXT,
  joined_on DATE NOT NULL,
  relieved_on DATE,
  blood_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staff_name TEXT NOT NULL,
  punch_in_time TEXT,
  punch_in_date DATE NOT NULL,
  punch_out_time TEXT,
  punch_out_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ioregister (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL,
  case_number TEXT NOT NULL,
  case_year TEXT NOT NULL,
  client_name TEXT NOT NULL,
  document_received TEXT NOT NULL,
  date DATE NOT NULL,
  staff_name TEXT NOT NULL,
  via TEXT,
  ref_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allocatework (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  case_number TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  assign_date DATE NOT NULL,
  complete_by_date DATE NOT NULL,
  work_details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS masters (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                                </code>
                                <button 
                                  onClick={() => {
                                    const sql = `CREATE TABLE IF NOT EXISTS cases (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  case_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  court TEXT NOT NULL,
  file_location TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  award_passed_date DATE,
  copy_app_filed_date DATE,
  award_copy_received INTEGER DEFAULT 0,
  legal_opinion_given INTEGER DEFAULT 0,
  amount_received INTEGER DEFAULT 0,
  receipt_sent INTEGER DEFAULT 0,
  disposed_date DATE,
  hearing_date DATE,
  other_details TEXT,
  next_posting_date DATE,
  filing_details TEXT,
  filed_on DATE,
  ref_number TEXT,
  cf_number TEXT,
  filing_other TEXT,
  petitioner_advocate TEXT,
  chance_for_settlement INTEGER DEFAULT 0,
  ca_received_date DATE,
  legal_opinion_sent_date DATE,
  case_type TEXT DEFAULT 'Other',
  is_connected INTEGER DEFAULT 0,
  connected_case_number TEXT,
  counsel_other_side TEXT,
  appearing_for TEXT,
  remarkable_case TEXT DEFAULT 'No',
  remarkable_comments TEXT,
  case_year TEXT,
  ws_filed TEXT DEFAULT 'No',
  investigation_received TEXT DEFAULT 'No',
  immediate_action TEXT DEFAULT 'No',
  immediate_action_remarks TEXT,
  immediate_action_completed_date TEXT
);

-- Run these if you already have the cases table but are missing columns:
ALTER TABLE cases ADD COLUMN IF NOT EXISTS remarkable_case TEXT DEFAULT 'No';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS remarkable_comments TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_year TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS ws_filed TEXT DEFAULT 'No';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS investigation_received TEXT DEFAULT 'No';

-- For ioregister table:
ALTER TABLE ioregister ADD COLUMN IF NOT EXISTS case_year TEXT;

CREATE TABLE IF NOT EXISTS priority (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  case_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  remind_on DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staff_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  mobile_number TEXT,
  address TEXT,
  joined_on DATE NOT NULL,
  relieved_on DATE,
  blood_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  staff_name TEXT NOT NULL,
  punch_in_time TEXT,
  punch_in_date DATE NOT NULL,
  punch_out_time TEXT,
  punch_out_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ioregister (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL,
  case_number TEXT NOT NULL,
  case_year TEXT NOT NULL,
  client_name TEXT NOT NULL,
  document_received TEXT NOT NULL,
  date DATE NOT NULL,
  staff_name TEXT NOT NULL,
  via TEXT,
  ref_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allocatework (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  case_number TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  assign_date DATE NOT NULL,
  complete_by_date DATE NOT NULL,
  work_details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS masters (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;
                                    navigator.clipboard.writeText(sql);
                                    showNotification('SQL copied to clipboard!');
                                  }}
                                  className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-lg shadow-sm text-red-700 transition-all opacity-0 group-hover/sql:opacity-100"
                                  title="Copy SQL"
                                >
                                  <ClipboardList size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm opacity-50 pointer-events-none">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">App Preferences</h3>
                      <p className="text-sm text-gray-500">Customize your workspace (Coming Soon).</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'case_view' ? (
            <motion.div
              key="case_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Case View (Schedule)</h2>
                  <p className="text-legal-slate">View cases organized by their hearing and next posting dates.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-legal-navy/10 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <User size={12} />
                      Client Filter
                    </label>
                    <input 
                      type="text"
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy placeholder:text-gray-300"
                      placeholder="Search Client..."
                      value={caseViewFilters.clientName}
                      onChange={(e) => setCaseViewFilters({...caseViewFilters, clientName: e.target.value})}
                    />
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <User size={12} />
                      Advocate Filter
                    </label>
                    <input 
                      type="text"
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy placeholder:text-gray-300"
                      placeholder="Search Advocate..."
                      value={caseViewFilters.advocateName}
                      onChange={(e) => setCaseViewFilters({...caseViewFilters, advocateName: e.target.value})}
                    />
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Scale size={12} />
                      Appearing For
                    </label>
                    <select 
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy appearance-none cursor-pointer"
                      value={caseViewFilters.appearingFor}
                      onChange={(e) => setCaseViewFilters({...caseViewFilters, appearingFor: e.target.value})}
                    >
                      <option value="all">All</option>
                      <option value="Petitioner">Petitioner</option>
                      <option value="Respondent">Respondent</option>
                      <option value="Company">Company</option>
                      <option value="R2">R2</option>
                      <option value="R3">R3</option>
                      <option value="R4">R4</option>
                      <option value="R5">R5</option>
                    </select>
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={12} />
                      Case Year
                    </label>
                    <input 
                      type="text"
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy placeholder:text-gray-300 w-20"
                      placeholder="Year..."
                      value={caseViewFilters.caseYear}
                      onChange={(e) => setCaseViewFilters({...caseViewFilters, caseYear: e.target.value})}
                    />
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={12} />
                      Filter by Date
                    </label>
                    <div className="flex items-center gap-2">
                        <input 
                          type="date"
                          className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy"
                          value={getRawDate(selectedViewDate)}
                          onChange={(e) => setSelectedViewDate(e.target.value)}
                        />
                      {selectedViewDate && (
                        <button 
                          onClick={() => setSelectedViewDate('')}
                          className="text-gray-400 hover:text-legal-burgundy transition-colors"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <button 
                    onClick={exportCaseViewPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl hover:bg-opacity-90 transition-all text-sm font-bold shadow-md"
                  >
                    <Download size={16} />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                {sortedScheduleDates.length > 0 ? (
                  sortedScheduleDates.map(date => (
                        <div key={date} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-legal-navy text-white px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                          {formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="h-px flex-1 bg-gray-200"></div>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {casesByScheduleDate[date].map(c => (
                          <motion.div 
                            key={c.id}
                            layout
                            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative"
                          >
                            <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  startEditing(c);
                                }}
                                className="p-2 text-gray-400 hover:text-legal-navy transition-colors bg-gray-50 rounded-lg"
                                title="Edit Case"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteCase(c.id);
                                }}
                                className="flex items-center gap-1 p-2 text-gray-400 hover:text-white hover:bg-legal-burgundy transition-all bg-gray-50 rounded-lg"
                                title="Delete Case"
                              >
                                <Trash2 size={18} />
                                <span className="text-[10px] font-bold uppercase pr-1">Delete</span>
                              </button>
                            </div>

                            <div className="flex items-start gap-4 mb-6">
                              <div className="w-12 h-12 bg-legal-navy/5 rounded-2xl flex items-center justify-center text-legal-navy">
                                <Briefcase size={24} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-legal-navy uppercase tracking-widest">
                                    {c.stage === 'Other' ? c.other_details || 'Other' : c.stage}
                                  </span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{c.case_number}</h3>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 mb-6">
                              {c.hearing_date && (
                                <div className={`p-3 rounded-2xl flex items-center gap-3 ${getRawDate(c.hearing_date) === date ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 border border-blue-100 text-blue-700'}`}>
                                  <Clock size={18} />
                                  <span className="text-sm font-bold">
                                    {getRawDate(c.hearing_date) === date ? 'Hearing Today: ' : 'Hearing Date: '}
                                    {formatDate(c.hearing_date)}
                                  </span>
                                </div>
                              )}
                              {c.next_posting_date && (
                                <div className={`p-3 rounded-2xl flex items-center gap-3 ${getRawDate(c.next_posting_date) === date ? 'bg-legal-gold text-white shadow-md' : 'bg-legal-gold/5 border border-legal-gold/20 text-legal-gold'}`}>
                                  <Calendar size={18} />
                                  <span className="text-sm font-bold">
                                    {getRawDate(c.next_posting_date) === date ? 'Posting Today: ' : 'Next Posting: '}
                                    {formatDate(c.next_posting_date)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <User size={16} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">{c.client_name}</span>
                                </div>
                                {c.appearing_for && (
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Scale size={16} className="text-gray-400" />
                                    <span className="font-bold text-legal-gold">For: {c.appearing_for}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Scale size={16} className="text-gray-400" />
                                  <span className="truncate">{c.court}</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <MapPin size={16} className="text-gray-400" />
                                  <span className="text-gray-700 font-medium">{c.file_location}</span>
                                </div>
                                {c.counsel_other_side && (
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Users size={16} className="text-gray-400" />
                                    <span className="text-gray-600 italic truncate" title={c.counsel_other_side}>Opp: {c.counsel_other_side}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-3xl p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <CalendarDays size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedViewDate ? `No schedule for ${formatDate(selectedViewDate)}` : 'No schedule found'}
                    </h3>
                    <p className="text-gray-500 max-w-xs">
                      {selectedViewDate ? 'Try selecting a different date or clear the filter.' : 'Cases with a hearing date or next posting date set will appear here.'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'staff_entry' ? (
            <motion.div
              key="staff_entry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Staff Entry</h2>
                <p className="text-gray-500">Add new staff members to the system.</p>
              </div>

              <form onSubmit={handleStaffSubmit} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User size={14} />
                      Staff Name
                    </label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      placeholder="Full Name"
                      value={staffFormData.staff_name}
                      onChange={(e) => setStaffFormData({...staffFormData, staff_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Briefcase size={14} />
                      Designation
                    </label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      placeholder="e.g. Junior Advocate"
                      value={staffFormData.designation}
                      onChange={(e) => setStaffFormData({...staffFormData, designation: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Phone size={14} />
                    Mobile Number
                  </label>
                  <input 
                    type="tel"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                    placeholder="e.g. +91 9876543210"
                    value={staffFormData.mobile_number}
                    onChange={(e) => setStaffFormData({...staffFormData, mobile_number: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MapPin size={14} />
                    Address
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all min-h-[80px]"
                    placeholder="Residential Address"
                    value={staffFormData.address}
                    onChange={(e) => setStaffFormData({...staffFormData, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={14} />
                      Joined On
                    </label>
                    <input 
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      value={staffFormData.joined_on}
                      onChange={(e) => setStaffFormData({...staffFormData, joined_on: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={14} />
                      Relieved On
                    </label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      value={staffFormData.relieved_on}
                      onChange={(e) => setStaffFormData({...staffFormData, relieved_on: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Hash size={14} />
                    Blood Group
                  </label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                    placeholder="e.g. O+ve"
                    value={staffFormData.blood_group}
                    onChange={(e) => setStaffFormData({...staffFormData, blood_group: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-legal-navy text-white py-4 rounded-2xl font-bold text-lg hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10 flex items-center justify-center gap-2"
                  >
                    <Plus size={24} />
                    Add Staff Member
                  </button>
                </div>
              </form>

              <div className="mt-12 space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Current Staff</h3>
                <div className="grid grid-cols-1 gap-4">
                  {staff.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{s.staff_name}</p>
                        <p className="text-sm text-gray-500">{s.designation} • Joined: {formatDate(s.joined_on)}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm('Delete this staff member?')) {
                            const res = await fetch(`/api/staff/${s.id}`, { method: 'DELETE' });
                            if (res.ok) fetchStaff();
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-legal-burgundy transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : view === 'attendance' ? (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Daily Attendance</h2>
                <p className="text-gray-500">Select a staff member and record their attendance.</p>
                <div className="mt-4 inline-block px-4 py-2 bg-legal-navy text-white rounded-full font-bold shadow-md">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Users size={16} />
                    Select Staff Member
                  </label>
                  <select 
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none text-lg font-medium"
                    value={selectedStaffForAttendance}
                    onChange={(e) => setSelectedStaffForAttendance(e.target.value)}
                  >
                    <option value="">-- Choose Staff --</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.staff_name}>{s.staff_name} ({s.designation})</option>
                    ))}
                  </select>
                </div>

                {selectedStaffForAttendance && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t border-gray-100"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <button 
                        onClick={() => handlePunch('attendance')}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={24} />
                        Punch Attendance
                      </button>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handlePunch('in')}
                          className="bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-600/10 flex items-center justify-center gap-2"
                        >
                          <LogIn size={24} />
                          Punch In
                        </button>
                        <button 
                          onClick={() => handlePunch('out')}
                          className="bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/10 flex items-center justify-center gap-2"
                        >
                          <LogOut size={24} />
                          Punch Out
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={resetAttendance}
                      className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      <XCircle size={18} />
                      Reset Selection
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : view === 'view_attendance' ? (
            <motion.div
              key="view_attendance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-bold tracking-tight text-legal-navy mb-2 serif">Attendance Records</h2>
                  <p className="text-gray-500">View and analyze staff attendance history.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400 ml-2" />
                    <input 
                      type="month"
                      className="bg-transparent border-none focus:ring-0 p-2 text-sm font-bold text-legal-navy"
                      value={attendanceFilters.month}
                      onChange={(e) => setAttendanceFilters({ month: e.target.value })}
                    />
                  </div>
                  <button 
                    onClick={exportAttendancePDF}
                    className="flex items-center gap-2 px-6 py-3 bg-legal-navy text-white rounded-2xl font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10"
                  >
                    <Download size={18} />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {staff.map(s => {
                  const daysAttended = attendance.filter(a => 
                    a.staff_name === s.staff_name && 
                    a.punch_in_date.startsWith(attendanceFilters.month)
                  ).length;
                  
                  return (
                    <div key={s.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{s.designation}</p>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{s.staff_name}</h3>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-legal-navy">{daysAttended}</span>
                        <span className="text-gray-400 font-medium mb-1">days attended in {new Date(attendanceFilters.month).toLocaleDateString(undefined, { month: 'long' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900">Detailed Logs</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Staff Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Punch In</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Punch Out</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Out Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance
                      .filter(a => a.punch_in_date.startsWith(attendanceFilters.month))
                      .map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{a.staff_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(a.punch_in_date)}</td>
                        <td className="px-6 py-4">
                          {a.punch_in_time ? (
                            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">
                              {a.punch_in_time}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs italic">Not punched in</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {a.punch_out_time ? (
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                              {a.punch_out_time}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs italic">Not punched out</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {a.punch_out_date ? formatDate(a.punch_out_date) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attendance.filter(a => a.punch_in_date.startsWith(attendanceFilters.month)).length === 0 && (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <ClipboardList size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No records for this month</h3>
                    <p className="text-gray-500">Attendance data will appear here once staff members start punching in.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'case_allotment' ? (
            <motion.div
              key="case_allotment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Case Allotment Details</h2>
                  <p className="text-legal-slate">Client-wise case allotment and details.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-legal-navy/10 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={12} />
                      Year
                    </label>
                    <input 
                      type="text"
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy placeholder:text-gray-300 w-16"
                      placeholder="All"
                      value={allotmentFilters.year}
                      onChange={(e) => setAllotmentFilters({...allotmentFilters, year: e.target.value})}
                    />
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <User size={12} />
                      Client
                    </label>
                    <input 
                      type="text"
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy placeholder:text-gray-300 w-32"
                      placeholder="Search..."
                      value={allotmentFilters.client}
                      onChange={(e) => setAllotmentFilters({...allotmentFilters, client: e.target.value})}
                    />
                  </div>
                  <div className="w-px h-8 bg-gray-100"></div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Scale size={12} />
                      Appearing For
                    </label>
                    <select 
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-legal-navy appearance-none cursor-pointer"
                      value={allotmentFilters.appearingFor}
                      onChange={(e) => setAllotmentFilters({...allotmentFilters, appearingFor: e.target.value})}
                    >
                      <option value="all">All</option>
                      <option value="Petitioner">Petitioner</option>
                      <option value="Respondent">Respondent</option>
                      <option value="Company">Company</option>
                      <option value="R2">R2</option>
                      <option value="R3">R3</option>
                      <option value="R4">R4</option>
                      <option value="R5">R5</option>
                    </select>
                  </div>
                  <button 
                    onClick={exportCaseAllotmentPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all shadow-sm ml-2"
                  >
                    <Download size={14} />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Year</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Appearing For</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Court</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cases
                      .filter(c => allotmentFilters.year === '' || c.case_year === allotmentFilters.year)
                      .filter(c => allotmentFilters.client === '' || c.client_name.toLowerCase().includes(allotmentFilters.client.toLowerCase()))
                      .filter(c => allotmentFilters.appearingFor === 'all' || c.appearing_for === allotmentFilters.appearingFor)
                      .map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{c.client_name}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{c.case_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{c.case_year || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{c.appearing_for || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{c.court}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cases
                  .filter(c => allotmentFilters.year === '' || c.case_year === allotmentFilters.year)
                  .filter(c => allotmentFilters.client === '' || c.client_name.toLowerCase().includes(allotmentFilters.client.toLowerCase()))
                  .filter(c => allotmentFilters.appearingFor === 'all' || c.appearing_for === allotmentFilters.appearingFor)
                  .length === 0 && (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                      <Briefcase size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No cases found</h3>
                    <p className="text-gray-500">Try adjusting your filters.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'ioregister' ? (
            <motion.div
              key="ioregister"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Inward Outward Register</h2>
                  <p className="text-legal-slate">Manage documents received and sent from the office.</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-2xl border border-legal-navy/10 shadow-sm">
                  <button 
                    onClick={() => { setIoSubView('Inward'); setIoFormData({...ioFormData, type: 'Inward'}); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${ioSubView === 'Inward' ? 'bg-legal-navy text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Inward
                  </button>
                  <button 
                    onClick={() => { setIoSubView('Outward'); setIoFormData({...ioFormData, type: 'Outward'}); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${ioSubView === 'Outward' ? 'bg-legal-navy text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Outward
                  </button>
                  <button 
                    onClick={() => setIoSubView('View')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${ioSubView === 'View' ? 'bg-legal-navy text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    View Register
                  </button>
                </div>
              </div>

              {ioSubView === 'View' ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm grid grid-cols-3 md:grid-cols-6 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Case No</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFilters.case_number}
                        onChange={(e) => setIoFilters({...ioFilters, case_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Year</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFilters.case_year}
                        onChange={(e) => setIoFilters({...ioFilters, case_year: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFilters.client_name}
                        onChange={(e) => setIoFilters({...ioFilters, client_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inward On</label>
                      <input 
                        type="date"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFilters.inward_on}
                        onChange={(e) => setIoFilters({...ioFilters, inward_on: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Outward On</label>
                      <input 
                        type="date"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFilters.outward_on}
                        onChange={(e) => setIoFilters({...ioFilters, outward_on: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Staff</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFilters.staff_name}
                        onChange={(e) => setIoFilters({...ioFilters, staff_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Register Entries</h3>
                      <button 
                        onClick={exportIoPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-bold hover:bg-legal-navy/90 transition-all"
                      >
                        <Download size={16} />
                        Export PDF
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case No</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Document</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Staff</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Via</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Ref No</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ioregister
                            .filter(item => {
                              const matchCase = !ioFilters.case_number || item.case_number.toLowerCase().includes(ioFilters.case_number.toLowerCase());
                              const matchYear = !ioFilters.case_year || item.case_year === ioFilters.case_year;
                              const matchClient = !ioFilters.client_name || item.client_name.toLowerCase().includes(ioFilters.client_name.toLowerCase());
                              const matchStaff = !ioFilters.staff_name || item.staff_name.toLowerCase().includes(ioFilters.staff_name.toLowerCase());
                              const matchInward = !ioFilters.inward_on || (item.type === 'Inward' && getRawDate(item.date) === ioFilters.inward_on);
                              const matchOutward = !ioFilters.outward_on || (item.type === 'Outward' && getRawDate(item.date) === ioFilters.outward_on);
                              return matchCase && matchYear && matchClient && matchStaff && matchInward && matchOutward;
                            })
                            .map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.type === 'Inward' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900">{item.case_number}/{item.case_year}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.client_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.document_received}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.date)}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.staff_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.via}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.ref_no}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleIoSubmit} className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Case Number</label>
                      <input 
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFormData.case_number}
                        onChange={(e) => setIoFormData({...ioFormData, case_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Case Year</label>
                      <input 
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFormData.case_year}
                        onChange={(e) => setIoFormData({...ioFormData, case_year: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Client Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                      value={ioFormData.client_name}
                      onChange={(e) => setIoFormData({...ioFormData, client_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Document Received</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                      value={ioFormData.document_received}
                      onChange={(e) => setIoFormData({...ioFormData, document_received: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{ioSubView === 'Inward' ? 'Inward On' : 'Outward On'}</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFormData.date}
                        onChange={(e) => setIoFormData({...ioFormData, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Staff Name</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20 appearance-none"
                        value={ioFormData.staff_name}
                        onChange={(e) => setIoFormData({...ioFormData, staff_name: e.target.value})}
                      >
                        <option value="">Select Staff</option>
                        {staff.map(s => <option key={s.id} value={s.staff_name}>{s.staff_name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{ioSubView === 'Inward' ? 'Received Via' : 'Send Via'}</label>
                      <input 
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFormData.via}
                        onChange={(e) => setIoFormData({...ioFormData, via: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Ref No</label>
                      <input 
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                        value={ioFormData.ref_no}
                        onChange={(e) => setIoFormData({...ioFormData, ref_no: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={resetIoForm}
                      className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Reset Fields
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] px-6 py-4 bg-legal-navy text-white rounded-2xl font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10"
                    >
                      Save Entry
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : view === 'work_allocation' ? (
            <motion.div
              key="work_allocation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Work Allocation</h2>
                  <p className="text-legal-slate">Assign and track tasks given to staff members.</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-2xl border border-legal-navy/10 shadow-sm">
                  <button 
                    onClick={() => setWorkSubView('Allot')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${workSubView === 'Allot' ? 'bg-legal-navy text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Allot Work
                  </button>
                  <button 
                    onClick={() => setWorkSubView('View')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${workSubView === 'View' ? 'bg-legal-navy text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    View Allotted Work
                  </button>
                </div>
              </div>

              {workSubView === 'View' ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Case No</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={workFilters.case_number}
                        onChange={(e) => setWorkFilters({...workFilters, case_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Staff</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={workFilters.staff_name}
                        onChange={(e) => setWorkFilters({...workFilters, staff_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign Date</label>
                      <input 
                        type="date"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={workFilters.assign_date}
                        onChange={(e) => setWorkFilters({...workFilters, assign_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">To Be Completed</label>
                      <input 
                        type="date"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={workFilters.complete_by_date}
                        onChange={(e) => setWorkFilters({...workFilters, complete_by_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Details</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20"
                        value={workFilters.work_details}
                        onChange={(e) => setWorkFilters({...workFilters, work_details: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
                      <select 
                        className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-legal-navy/20 appearance-none"
                        value={workFilters.status}
                        onChange={(e) => setWorkFilters({...workFilters, status: e.target.value as any})}
                      >
                        <option value="all">All Works</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Work Allocations</h3>
                      <button 
                        onClick={exportWorkPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-bold hover:bg-legal-navy/90 transition-all"
                      >
                        <Download size={16} />
                        Export PDF
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case No</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Staff Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Assign Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Complete By</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Work Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Remark</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {allocatework
                            .filter(item => {
                              const matchCase = !workFilters.case_number || item.case_number.toLowerCase().includes(workFilters.case_number.toLowerCase());
                              const matchStaff = !workFilters.staff_name || item.staff_name.toLowerCase().includes(workFilters.staff_name.toLowerCase());
                              const matchAssign = !workFilters.assign_date || getRawDate(item.assign_date) === workFilters.assign_date;
                              const matchComplete = !workFilters.complete_by_date || getRawDate(item.complete_by_date) === workFilters.complete_by_date;
                              const matchDetails = !workFilters.work_details || item.work_details.toLowerCase().includes(workFilters.work_details.toLowerCase());
                              const matchStatus = workFilters.status === 'all' || item.status === workFilters.status;
                              return matchCase && matchStaff && matchAssign && matchComplete && matchDetails && matchStatus;
                            })
                            .map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{item.case_number}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-tight">
                                  {(() => {
                                    const c = cases.find(c => c.case_number === item.case_number);
                                    return `${c?.court || 'N/A'} - ${c?.case_type || 'N/A'}`;
                                  })()}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.staff_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.assign_date)}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 font-bold text-amber-600">
                                {formatDate(item.complete_by_date)}
                                {item.actual_completion_date && (
                                  <div className="text-[10px] text-emerald-600 font-normal mt-1">
                                    Done: {formatDate(item.actual_completion_date)}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.work_details}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {item.status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{item.remark || '-'}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  {completingWorkId === item.id ? (
                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                      <input 
                                        type="text"
                                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-legal-navy/20"
                                        placeholder="Add remark..."
                                        value={completionRemark}
                                        onChange={(e) => setCompletionRemark(e.target.value)}
                                        autoFocus
                                      />
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => handleUpdateWorkStatus(item.id, item.status === 'Completed' ? 'Pending' : 'Completed', completionRemark)}
                                          className="px-3 py-1 bg-legal-navy text-white text-[10px] font-bold rounded-lg hover:bg-legal-navy/90"
                                        >
                                          Confirm
                                        </button>
                                        <button 
                                          onClick={() => { setCompletingWorkId(null); setCompletionRemark(''); }}
                                          className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-200"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      {item.status !== 'Completed' ? (
                                        <button 
                                          onClick={() => { setCompletingWorkId(item.id); setCompletionRemark(item.remark || ''); }}
                                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                          title="Mark as Completed"
                                        >
                                          <CheckCircle2 size={18} />
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => { setCompletingWorkId(item.id); setCompletionRemark(item.remark || ''); }}
                                          className="p-2 text-gray-400 hover:text-legal-navy hover:bg-gray-100 rounded-lg transition-colors"
                                          title="Undo Completion"
                                        >
                                          <RotateCcw size={18} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleWorkSubmit} className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Case Number</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20 appearance-none"
                      value={workFormData.case_number}
                      onChange={(e) => setWorkFormData({...workFormData, case_number: e.target.value})}
                    >
                      <option value="">Select Case</option>
                      {cases.map(c => <option key={c.id} value={c.case_number}>{c.case_number} - {c.client_name} ({c.court} - {c.case_type})</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Staff Name</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20 appearance-none"
                      value={workFormData.staff_name}
                      onChange={(e) => setWorkFormData({...workFormData, staff_name: e.target.value})}
                    >
                      <option value="">Select Staff</option>
                      {staff.map(s => <option key={s.id} value={s.staff_name}>{s.staff_name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Assign Date</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                        value={workFormData.assign_date}
                        onChange={(e) => setWorkFormData({...workFormData, assign_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">To Be Completed Date</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                        value={workFormData.complete_by_date}
                        onChange={(e) => setWorkFormData({...workFormData, complete_by_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Work Details</label>
                    <textarea 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20 min-h-[120px]"
                      placeholder="Enter task details..."
                      value={workFormData.work_details}
                      onChange={(e) => setWorkFormData({...workFormData, work_details: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Remark (Optional)</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-legal-navy/20"
                      placeholder="Any additional notes..."
                      value={workFormData.remark}
                      onChange={(e) => setWorkFormData({...workFormData, remark: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={resetWorkForm}
                      className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Reset Fields
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] px-6 py-4 bg-legal-navy text-white rounded-2xl font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10"
                    >
                      Allot Work
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : view === 'pending_work' ? (
            <motion.div
              key="pending_work"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Pending Work</h2>
                  <p className="text-legal-slate">Manage cases requiring immediate action.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button 
                    onClick={() => setShowCompletedWork(!showCompletedWork)}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all ${showCompletedWork ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                  >
                    {showCompletedWork ? 'Showing All' : 'Showing Pending Only'}
                  </button>
                  <button 
                    onClick={exportPendingWorkPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-legal-navy text-white rounded-2xl hover:bg-legal-navy/90 transition-all font-bold shadow-lg shadow-legal-navy/10"
                  >
                    <Download size={20} />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Client</label>
                  <input 
                    type="text"
                    placeholder="Filter by client..."
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-legal-navy/10 outline-none transition-all text-sm"
                    value={pendingWorkFilters.client}
                    onChange={(e) => setPendingWorkFilters({...pendingWorkFilters, client: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Court</label>
                  <input 
                    type="text"
                    placeholder="Filter by court..."
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-legal-navy/10 outline-none transition-all text-sm"
                    value={pendingWorkFilters.court}
                    onChange={(e) => setPendingWorkFilters({...pendingWorkFilters, court: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Case Type</label>
                  <input 
                    type="text"
                    placeholder="Filter by type..."
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-legal-navy/10 outline-none transition-all text-sm"
                    value={pendingWorkFilters.caseType}
                    onChange={(e) => setPendingWorkFilters({...pendingWorkFilters, caseType: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">WS Filed</label>
                  <select 
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-legal-navy/10 outline-none transition-all text-sm"
                    value={pendingWorkFilters.wsFiled}
                    onChange={(e) => setPendingWorkFilters({...pendingWorkFilters, wsFiled: e.target.value})}
                  >
                    <option value="all">All WS Status</option>
                    <option value="Yes">Filed</option>
                    <option value="No">Not Filed</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Case Details</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type & Dates</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Immediate Action Remarks</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Completion Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cases
                        .filter(c => showCompletedWork ? (c.immediate_action === 'Yes' || c.immediate_action === 'No') && c.immediate_action_remarks : c.immediate_action === 'Yes')
                        .filter(c => {
                          const matchesClient = c.client_name.toLowerCase().includes(pendingWorkFilters.client.toLowerCase());
                          const matchesCourt = c.court.toLowerCase().includes(pendingWorkFilters.court.toLowerCase());
                          const matchesCaseType = (c.case_type || '').toLowerCase().includes(pendingWorkFilters.caseType.toLowerCase());
                          const matchesWS = pendingWorkFilters.wsFiled === 'all' || 
                            (pendingWorkFilters.wsFiled === 'Yes' ? c.ws_filed === 'Yes' : c.ws_filed !== 'Yes');
                          return matchesClient && matchesCourt && matchesCaseType && matchesWS;
                        })
                        .map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{c.case_number}</div>
                            <div className="text-xs text-gray-500 mt-1">{c.court}</div>
                            <div className="text-xs font-medium text-legal-navy mt-1">{c.client_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-700">{c.case_type || 'Other'}</div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                              <Calendar size={12} />
                              Next Posting: {c.next_posting_date ? formatDate(c.next_posting_date) : 'Not set'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold w-fit ${c.investigation_received === 'Yes' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                Inv: {c.investigation_received || 'No'}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold w-fit ${c.ws_filed === 'Yes' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                WS: {c.ws_filed === 'Yes' ? 'Filed' : 'Not Filed'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.immediate_action_remarks || '-'}</td>
                          <td className="px-6 py-4">
                            {c.immediate_action === 'Yes' ? (
                              <input 
                                type="date"
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-legal-navy/20"
                                value={pendingWorkCompletionDates[c.id] || ''}
                                onChange={(e) => setPendingWorkCompletionDates({
                                  ...pendingWorkCompletionDates,
                                  [c.id]: e.target.value
                                })}
                              />
                            ) : (
                              <span className="text-sm text-emerald-600 font-bold">
                                {c.immediate_action_completed_date ? formatDate(c.immediate_action_completed_date) : 'Completed'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {c.immediate_action === 'Yes' ? (
                              <button 
                                onClick={() => {
                                  const date = pendingWorkCompletionDates[c.id];
                                  if (!date) {
                                    showNotification('Please select a completion date', 'error');
                                    return;
                                  }
                                  handleImmediateActionComplete(c.id, 'No', date);
                                }}
                                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10"
                              >
                                Mark Completed
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleImmediateActionComplete(c.id, 'Yes', '')}
                                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-all shadow-md shadow-amber-600/10"
                              >
                                Mark Pending
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {cases.filter(c => showCompletedWork ? (c.immediate_action === 'Yes' || c.immediate_action === 'No') && c.immediate_action_remarks : c.immediate_action === 'Yes').filter(c => {
                          const matchesClient = c.client_name.toLowerCase().includes(pendingWorkFilters.client.toLowerCase());
                          const matchesCourt = c.court.toLowerCase().includes(pendingWorkFilters.court.toLowerCase());
                          const matchesCaseType = (c.case_type || '').toLowerCase().includes(pendingWorkFilters.caseType.toLowerCase());
                          const matchesWS = pendingWorkFilters.wsFiled === 'all' || 
                            (pendingWorkFilters.wsFiled === 'Yes' ? c.ws_filed === 'Yes' : c.ws_filed !== 'Yes');
                          return matchesClient && matchesCourt && matchesCaseType && matchesWS;
                        }).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                            No matching immediate actions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : view === 'remarkable_cases' ? (
            <motion.div
              key="remarkable_cases"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">Remarkable Cases</h2>
                <p className="text-gray-500">Cases marked as remarkable for special attention.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cases.filter(c => c.remarkable_case === 'Yes').map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                          <Trophy size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.case_year}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{c.case_number}</h3>
                      <p className="text-sm font-medium text-gray-600 mb-4">{c.client_name}</p>
                      {c.remarkable_comments && (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 italic text-xs text-gray-500">
                          "{c.remarkable_comments}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {cases.filter(c => c.remarkable_case === 'Yes').length === 0 && (
                <div className="p-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                    <Trophy size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No remarkable cases</h3>
                  <p className="text-gray-500">Mark cases as "Remarkable" in the entry form to see them here.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="entry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="mb-10">
                <button 
                  onClick={() => setView('dashboard')}
                  className="text-gray-400 hover:text-gray-600 flex items-center gap-2 mb-4 transition-colors"
                >
                  <ChevronRight size={20} className="rotate-180" />
                  Back to Dashboard
                </button>
                <h2 className="text-3xl font-bold tracking-tight mb-2 serif text-legal-navy">
                  {editingId ? 'Edit Case Details' : 'New Case Entry'}
                </h2>
                <p className="text-legal-slate">
                  {editingId ? 'Update the information for this legal proceeding.' : 'Enter the details for the new legal proceeding.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-legal-navy/5 shadow-xl space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Hash size={14} />
                      Case Number
                    </label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      placeholder="e.g. OS 123/2024"
                      value={formData.case_number}
                      onChange={(e) => setFormData({...formData, case_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={14} />
                      Case Year
                    </label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      placeholder="e.g. 2024"
                      value={formData.case_year}
                      onChange={(e) => setFormData({...formData, case_year: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <User size={14} />
                    Client Name
                  </label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  >
                    <option value="">Select Client</option>
                    {masters.filter(m => m.category === 'Client').map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Scale size={14} />
                    Court
                  </label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                    value={formData.court}
                    onChange={(e) => setFormData({...formData, court: e.target.value})}
                  >
                    <option value="">Select Court</option>
                    {masters.filter(m => m.category === 'Court').map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <MapPin size={14} />
                      File Location
                    </label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.file_location}
                      onChange={(e) => setFormData({...formData, file_location: e.target.value})}
                    >
                      <option value="">Select Shelf</option>
                      {masters.filter(m => m.category === 'Shelf').map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <FileText size={14} />
                      Current Stage
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.stage}
                      onChange={(e) => setFormData({...formData, stage: e.target.value as CaseStage})}
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User size={14} />
                      Petitioner Advocate
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.petitioner_advocate}
                      onChange={(e) => setFormData({...formData, petitioner_advocate: e.target.value})}
                    >
                      <option value="">Select Advocate</option>
                      {masters.filter(m => m.category === 'Advocate').map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Scale size={14} />
                      Case Type
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.case_type}
                      onChange={(e) => setFormData({...formData, case_type: e.target.value})}
                    >
                      <option value="">Select Case Type</option>
                      {masters.filter(m => m.category === 'Case Category').map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User size={14} />
                      Counsel Other side
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.counsel_other_side}
                      onChange={(e) => setFormData({...formData, counsel_other_side: e.target.value})}
                    >
                      <option value="">Select Advocate</option>
                      {masters.filter(m => m.category === 'Advocate').map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Scale size={14} />
                      Appearing for
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.appearing_for}
                      onChange={(e) => setFormData({...formData, appearing_for: e.target.value as any})}
                    >
                      <option value="Petitioner">Petitioner</option>
                      <option value="Respondent">Respondent</option>
                      <option value="Company">Company</option>
                      <option value="R2">R2</option>
                      <option value="R3">R3</option>
                      <option value="R4">R4</option>
                      <option value="R5">R5</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Scale size={14} />
                    Chance for Settlement?
                  </label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                    value={formData.chance_for_settlement}
                    onChange={(e) => setFormData({...formData, chance_for_settlement: Number(e.target.value)})}
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Link size={14} />
                      Connected Cases?
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.is_connected}
                      onChange={(e) => setFormData({...formData, is_connected: Number(e.target.value)})}
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  {formData.is_connected === 1 && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Hash size={14} />
                        Connected Case Number
                      </label>
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                        value={formData.connected_case_number}
                        onChange={(e) => setFormData({...formData, connected_case_number: e.target.value})}
                      >
                        <option value="">Select Case Number</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.case_number}>{c.case_number} - {c.client_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {formData.stage !== 'Disposed' && formData.stage !== 'Award Passed' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={14} />
                      Next Posting Date
                    </label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      value={getRawDate(formData.next_posting_date)}
                      onChange={(e) => setFormData({...formData, next_posting_date: e.target.value})}
                    />
                  </div>
                )}

                {formData.stage === 'Award Passed' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 pt-4 border-t border-gray-100"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Award Passed On</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          value={getRawDate(formData.award_passed_date)}
                          onChange={(e) => setFormData({...formData, award_passed_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Copy App Filed On</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          value={getRawDate(formData.copy_app_filed_date)}
                          onChange={(e) => setFormData({...formData, copy_app_filed_date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">CA Received On</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          value={getRawDate(formData.ca_received_date)}
                          onChange={(e) => setFormData({...formData, ca_received_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Legal Opinion Sent On</label>
                        <input 
                          type="date"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                          value={getRawDate(formData.legal_opinion_sent_date)}
                          onChange={(e) => setFormData({...formData, legal_opinion_sent_date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox"
                          checked={!!formData.award_copy_received}
                          onChange={(e) => setFormData({...formData, award_copy_received: e.target.checked ? 1 : 0})}
                          className="rounded text-legal-navy focus:ring-legal-navy"
                        />
                        <span className="text-sm font-medium">Award Copy Received?</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox"
                          checked={!!formData.legal_opinion_given}
                          onChange={(e) => setFormData({...formData, legal_opinion_given: e.target.checked ? 1 : 0})}
                          className="rounded text-legal-navy focus:ring-legal-navy"
                        />
                        <span className="text-sm font-medium">Legal Opinion Given?</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox"
                          checked={!!formData.amount_received}
                          onChange={(e) => setFormData({...formData, amount_received: e.target.checked ? 1 : 0})}
                          className="rounded text-legal-navy focus:ring-legal-navy"
                        />
                        <span className="text-sm font-medium">Amount Received?</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox"
                          checked={!!formData.receipt_sent}
                          onChange={(e) => setFormData({...formData, receipt_sent: e.target.checked ? 1 : 0})}
                          className="rounded text-legal-navy focus:ring-legal-navy"
                        />
                        <span className="text-sm font-medium">Receipt Sent?</span>
                      </label>
                    </div>
                  </motion.div>
                )}

                {formData.stage === 'Disposed' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-4 border-t border-gray-100"
                  >
                    <label className="text-sm font-bold text-gray-700">Disposed Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      value={getRawDate(formData.disposed_date)}
                      onChange={(e) => setFormData({...formData, disposed_date: e.target.value})}
                    />
                  </motion.div>
                )}

                {formData.stage === 'Hearing' && false && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-4 border-t border-gray-100"
                  >
                    <label className="text-sm font-bold text-gray-700">Hearing Date</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      value={getRawDate(formData.hearing_date)}
                      onChange={(e) => setFormData({...formData, hearing_date: e.target.value})}
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Trophy size={14} />
                      Remarkable Case?
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.remarkable_case}
                      onChange={(e) => setFormData({...formData, remarkable_case: e.target.value as 'Yes' | 'No'})}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <FileText size={14} />
                      Remarkable Comments
                    </label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                      placeholder="Add comments if remarkable"
                      value={formData.remarkable_comments}
                      onChange={(e) => setFormData({...formData, remarkable_comments: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <FileText size={14} />
                      WS Filed?
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.ws_filed}
                      onChange={(e) => setFormData({...formData, ws_filed: e.target.value as 'Yes' | 'No'})}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <FileText size={14} />
                      Investigation Received?
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.investigation_received}
                      onChange={(e) => setFormData({...formData, investigation_received: e.target.value as 'Yes' | 'No'})}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <AlertCircle size={14} />
                      Immediate Action?
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all appearance-none"
                      value={formData.immediate_action}
                      onChange={(e) => setFormData({...formData, immediate_action: e.target.value as 'Yes' | 'No'})}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  {formData.immediate_action === 'Yes' && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <FileText size={14} />
                        Immediate Action Remarks <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required={formData.immediate_action === 'Yes'}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all"
                        placeholder="Enter remarks..."
                        value={formData.immediate_action_remarks}
                        onChange={(e) => setFormData({...formData, immediate_action_remarks: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                {formData.stage === 'Other' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-4 border-t border-gray-100"
                  >
                    <label className="text-sm font-bold text-gray-700">Other Details</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/20 focus:border-legal-navy transition-all min-h-[100px]"
                      placeholder="Enter specific stage details..."
                      value={formData.other_details}
                      onChange={(e) => setFormData({...formData, other_details: e.target.value})}
                    />
                  </motion.div>
                )}

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-legal-navy text-white py-4 rounded-2xl font-bold text-lg hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/10 flex items-center justify-center gap-2"
                  >
                    {editingId ? <CheckCircle2 size={24} /> : <Plus size={24} />}
                    {editingId ? 'Update Case Details' : 'Register Case'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
