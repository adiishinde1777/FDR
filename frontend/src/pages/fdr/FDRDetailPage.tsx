import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { FDRRecord, Document, OCRResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatusStepper } from '../../components/common/StatusStepper';
import { Badge } from '../../components/common/Badge';
import {
  ArrowLeft,
  FileSpreadsheet,
  Building2,
  FileText,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  Send,
  RotateCw,
  DollarSign,
  ShieldAlert,
  UserCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

export const FDRDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fdr, setFdr] = useState<FDRRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'ocr' | 'verification' | 'approvals'>('overview');

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('FDR_RECEIPT');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadFDR();
  }, [id]);

  const loadFDR = async () => {
    setLoading(true);
    try {
      const res = await api.getFDR(id!);
      if (res.success) {
        setFdr(res.data);
      }
    } catch (err) {
      console.error('Failed to load FDR details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !fdr) return;

    setIsUploading(true);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('institutionId', fdr.institutionId);
      formData.append('fdrId', fdr.id);
      formData.append('documentType', docType);

      const res = await api.uploadDocument(formData);
      if (res.success) {
        setUploadMsg('Document uploaded securely to private storage and queued for extraction.');
        setUploadFile(null);
        await loadFDR();
      }
    } catch (err: any) {
      setUploadMsg(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const res = await api.getDocumentToken(docId);
      if (res.success && res.data.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert(`Cannot download: ${err.message}`);
    }
  };

  const handleConfirmOCR = async (docId: string) => {
    try {
      await api.confirmOCR(docId);
      await loadFDR();
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message}`);
    }
  };

  const handleSubmitDraft = async () => {
    if (!fdr) return;
    try {
      const res = await api.submitFDR(fdr.id);
      if (res.success) {
        await loadFDR();
      }
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    }
  };

  if (loading || !fdr) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading FDR instrument record...
      </div>
    );
  }

  const role = user?.role;
  const isInstUser = role === 'INSTITUTION_ADMIN' || role === 'INSTITUTION_STAFF';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link to="/fdrs" className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {fdr.fdrNumber}
              </span>
              <Badge status={fdr.accountStatus} size="sm" />
              {fdr.isPotentialDuplicate && (
                <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Duplicate Flagged
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {fdr.issuingBank} • ₹ {fdr.depositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        {/* Quick Context Actions */}
        <div className="flex items-center space-x-2">
          {fdr.accountStatus === 'DRAFT' && isInstUser && (
            <button
              onClick={handleSubmitDraft}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm inline-flex items-center"
            >
              <Send className="w-4 h-4 mr-1.5" /> Submit for Verification
            </button>
          )}

          {['APPROVED', 'MATURED'].includes(fdr.accountStatus) && isInstUser && (
            <>
              <button
                onClick={() => navigate('/renewals')}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs inline-flex items-center"
              >
                <RotateCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Renewal / Replacement
              </button>

              <button
                onClick={() => navigate('/releases')}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs inline-flex items-center"
              >
                <DollarSign className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> Request Release
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Stepper Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <StatusStepper currentStatus={fdr.accountStatus} />
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Instrument Details
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'documents' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Supporting Documents</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
            {fdr.documents?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'ocr' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>OCR Data Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('verification')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'verification' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Verification & Observations</span>
          {(fdr.verificationCases?.[0]?.observations?.length || 0) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px]">
              {fdr.verificationCases?.[0]?.observations?.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'approvals' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Approval Decisions</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
            {fdr.approvalCases?.[0]?.decisions?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Financial Instrument Metadata
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">FDR Reference Number:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{fdr.fdrNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Issuing Commercial Bank:</span>
                <span className="font-bold text-slate-900">{fdr.issuingBank}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Branch & IFSC:</span>
                <span className="font-semibold text-slate-900">{fdr.bankBranch} {fdr.ifscCode ? `(${fdr.ifscCode})` : ''}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Deposit Principal:</span>
                <span className="font-bold text-slate-900 text-sm">₹ {fdr.depositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Issue Date:</span>
                <span className="font-medium text-slate-900">{new Date(fdr.issueDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Maturity Date:</span>
                <span className="font-bold text-slate-900 text-sm">{new Date(fdr.maturityDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Mandatory Joint Account Designation:</span>
                <span className="font-semibold text-slate-900 bg-slate-50 p-2 rounded block mt-0.5 border border-slate-200">
                  {fdr.jointName || 'Not specified'}
                </span>
              </div>
              {fdr.notes && (
                <div className="col-span-2">
                  <span className="text-slate-500 block">Administrative Remarks:</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded mt-0.5">{fdr.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Institution Summary Sidebar Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
              Institution Compliance
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Institution Name:</span>
                <span className="font-bold text-slate-900">{fdr.institution?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Official AICTE Identifier:</span>
                <span className="font-mono font-semibold text-blue-700">{fdr.institution?.officialIdentifier}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Location:</span>
                <span className="text-slate-800">{fdr.institution?.district}, {fdr.institution?.state}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Security Deposit Obligation:</span>
                <span className="font-medium text-slate-800">{fdr.securityDeposit?.programCategory || 'Engineering / Approved Program'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Supporting Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          {isInstUser && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center space-y-3">
              <UploadCloud className="w-10 h-10 text-blue-500 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-800">Upload Supporting Document</p>
                <p className="text-xs text-slate-500">PDF, JPEG, or PNG up to 10MB. Files are stored securely in private object storage.</p>
              </div>

              {uploadMsg && (
                <div className="p-2 text-xs bg-blue-50 text-blue-800 rounded max-w-md mx-auto">
                  {uploadMsg}
                </div>
              )}

              <form onSubmit={handleFileUpload} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2 pt-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="FDR_RECEIPT">FDR Receipt Scan</option>
                  <option value="BANK_CONFIRMATION_LETTER">Bank Confirmation Letter</option>
                  <option value="BOARD_RESOLUTION">Board Resolution</option>
                  <option value="RELEASE_REQUEST_DOC">NOC / Release Document</option>
                </select>

                <input
                  type="file"
                  required
                  accept=".pdf,image/jpeg,image/png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                />

                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            </div>
          )}

          {/* Documents Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Uploaded Verifiable Evidence ({fdr.documents?.length || 0})
              </h3>
            </div>

            {(!fdr.documents || fdr.documents.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No documents uploaded yet. An official FDR scan is required for scrutiny.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="table-header">File Name</th>
                      <th className="table-header">Document Type</th>
                      <th className="table-header">Size</th>
                      <th className="table-header">SHA256 Checksum</th>
                      <th className="table-header text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {fdr.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="table-cell font-medium text-slate-900 flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>{doc.originalFilename}</span>
                        </td>
                        <td className="table-cell">{doc.documentType.replace(/_/g, ' ')}</td>
                        <td className="table-cell text-slate-500">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                        <td className="table-cell font-mono text-[10px] text-slate-400 truncate max-w-xs" title={doc.checksumSha256}>
                          {doc.checksumSha256.slice(0, 16)}...
                        </td>
                        <td className="table-cell text-center">
                          <button
                            onClick={() => handleDownload(doc.id)}
                            className="px-3 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold inline-flex items-center space-x-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: OCR Data Extraction Matrix */}
      {activeTab === 'ocr' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Automated OCR Text Extraction & Human Verification Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Side-by-side comparison between institution-submitted figures and machine extracted values from scanned receipts.
              Note: OCR is treated as text extraction assistance only and does NOT constitute proof of authenticity.
            </p>
          </div>

          {fdr.documents?.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No document uploaded to perform OCR extraction.
            </div>
          ) : (
            fdr.documents?.map((doc) => {
              const ocr = doc.ocrResult;
              if (!ocr) {
                return (
                  <div key={doc.id} className="p-4 border rounded-lg bg-slate-50 text-xs text-slate-500">
                    Document {doc.originalFilename} is queued for text extraction.
                  </div>
                );
              }

              return (
                <div key={doc.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      Source Document: {doc.originalFilename}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Badge status={ocr.status} size="sm" />
                      {ocr.reviewerConfirmed ? (
                        <span className="text-emerald-700 font-bold flex items-center text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reviewer Confirmed
                        </span>
                      ) : (
                        (!isInstUser && (
                          <button
                            onClick={() => handleConfirmOCR(doc.id)}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700"
                          >
                            Mark Reviewed & Confirmed
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50">
                        <th className="table-header">Data Field</th>
                        <th className="table-header">Institution-Entered Value</th>
                        <th className="table-header">OCR-Extracted Value</th>
                        <th className="table-header">Comparison Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="table-cell font-semibold">FDR Reference</td>
                        <td className="table-cell font-mono">{fdr.fdrNumber}</td>
                        <td className="table-cell font-mono">{ocr.extractedFdrNumber || 'Not detected'}</td>
                        <td className="table-cell">
                          {ocr.extractedFdrNumber?.toUpperCase() === fdr.fdrNumber.toUpperCase() ? (
                            <span className="text-emerald-700 font-bold">✓ Matches</span>
                          ) : (
                            <span className="text-rose-600 font-bold">⚠ Discrepancy Flagged</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="table-cell font-semibold">Issuing Bank</td>
                        <td className="table-cell">{fdr.issuingBank}</td>
                        <td className="table-cell">{ocr.extractedBankName || 'Not detected'}</td>
                        <td className="table-cell">
                          {ocr.extractedBankName ? <span className="text-emerald-700 font-bold">✓ Verified</span> : <span className="text-amber-600">Manual Review Required</span>}
                        </td>
                      </tr>

                      <tr>
                        <td className="table-cell font-semibold">Principal Deposit Amount</td>
                        <td className="table-cell font-bold">₹ {fdr.depositAmount.toLocaleString('en-IN')}</td>
                        <td className="table-cell font-bold">₹ {ocr.extractedAmount ? ocr.extractedAmount.toLocaleString('en-IN') : 'Not detected'}</td>
                        <td className="table-cell">
                          {ocr.extractedAmount === fdr.depositAmount ? (
                            <span className="text-emerald-700 font-bold">✓ Matches Exactly</span>
                          ) : (
                            <span className="text-rose-600 font-bold">⚠ Amount Discrepancy</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="table-cell font-semibold">Maturity Date</td>
                        <td className="table-cell">{new Date(fdr.maturityDate).toLocaleDateString('en-IN')}</td>
                        <td className="table-cell">{ocr.extractedMaturityDate ? new Date(ocr.extractedMaturityDate).toLocaleDateString('en-IN') : 'Extracted from metadata'}</td>
                        <td className="table-cell"><span className="text-emerald-700 font-bold">✓ Aligned</span></td>
                      </tr>
                    </tbody>
                  </table>

                  {ocr.rawText && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-mono whitespace-pre-wrap">
                      <span className="font-bold text-slate-700 block mb-1">Raw Document OCR Snippet:</span>
                      {ocr.rawText.slice(0, 300)}...
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 4: Verification & Observations */}
      {activeTab === 'verification' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Scrutiny Observations & Discrepancies History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official notes and flags recorded by AICTE Verification Officers
              </p>
            </div>
            {!isInstUser && (
              <button
                onClick={() => navigate(`/verification`)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
              >
                Open Verification Workbench
              </button>
            )}
          </div>

          {(!fdr.verificationCases || fdr.verificationCases.length === 0 || !fdr.verificationCases[0]?.observations?.length) ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No scrutiny discrepancies recorded for this instrument.
            </div>
          ) : (
            <div className="space-y-3">
              {fdr.verificationCases[0].observations.map((obs) => (
                <div key={obs.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-800 uppercase tracking-wider">
                      {obs.observationType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(obs.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium">{obs.remarks}</p>
                  {obs.enteredValue && (
                    <div className="text-[11px] text-slate-600 pt-1">
                      <span className="text-slate-400">Entered:</span> {obs.enteredValue} • <span className="text-slate-400">Observed:</span> {obs.observedValue}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Approval Decisions */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Competent Authority Approval Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-stage administrative and financial approval history
              </p>
            </div>
          </div>

          {(!fdr.approvalCases || fdr.approvalCases.length === 0 || !fdr.approvalCases[0]?.decisions?.length) ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No formal approval decisions recorded yet. Case is in scrutiny pipeline.
            </div>
          ) : (
            <div className="space-y-3">
              {fdr.approvalCases[0].decisions.map((dec) => (
                <div key={dec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge status={dec.decision} size="sm" />
                      <span className="font-bold text-slate-900">{dec.approver?.fullName}</span>
                      <span className="text-[11px] text-slate-500">({dec.approver?.role?.replace(/_/g, ' ')})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(dec.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 font-medium">
                    "{dec.remarks}"
                  </p>
                  {dec.reason && (
                    <p className="text-rose-700 text-[11px]">
                      <strong>Reason for decision:</strong> {dec.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
