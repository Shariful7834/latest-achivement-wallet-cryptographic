import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCredential, shareCredential, getCredentialJwt, getCredentialJwtUrl, revokeCredential, unrevokeCredential } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Award, Share2, Copy, ExternalLink, Clock, Shield, CheckCircle, ArrowLeft, FileKey, Download, Ban, RotateCcw, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CredentialDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [cred, setCred] = useState(null);
  const [ob3, setOb3] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [jwt, setJwt] = useState(null);

  const loadCredential = async () => {
    try {
      const res = await getCredential(id);
      setCred(res.data.credential);
      setOb3(res.data.ob3);
      setShares(res.data.shares || []);
    } catch {
      setCred(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadCredential();
    getCredentialJwt(id).then(r => setJwt(r.data)).catch(() => setJwt(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await shareCredential(id, 30);
      toast.success('Share link created!');
      const fullUrl = `${window.location.origin}/shared/${id}?token=${res.data.token}`;
      navigator.clipboard.writeText(fullUrl);
      toast.success('Link copied to clipboard');
      setShares(prev => [...prev, { token: res.data.token, expiresAt: res.data.expiresAt, createdAt: new Date().toISOString(), viewCount: 0 }]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  const copyOb3 = () => {
    navigator.clipboard.writeText(JSON.stringify(ob3, null, 2));
    toast.success('OB 3.0 JSON copied');
  };

  const copyJwt = () => {
    if (!jwt) return;
    navigator.clipboard.writeText(jwt);
    toast.success('JWT copied');
  };

  const downloadJwt = () => {
    if (!jwt) return;
    const url = getCredentialJwtUrl(id, true);
    window.open(url, '_blank', 'noopener');
  };

  const verifyOnCertLister = () => {
    if (jwt) navigator.clipboard.writeText(jwt);
    window.open('https://certlister.com/ob3-validator/', '_blank', 'noopener');
    if (jwt) toast.success('JWT copied — paste it on CertLister');
  };

  const downloadPdf = () => {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const recipientName = cred.holderName || user.name || '';
    const recipientEmail = cred.holderEmail || user.email || (ob3?.credentialSubject?.id || '').replace('mailto:', '');
    const desc = ob3?.credentialSubject?.achievement?.description || cred.achievementDescription || '';
    const issued = new Date(cred.issuedDate || cred.createdAt).toLocaleDateString();
    const validUntil = ob3?.validUntil ? new Date(ob3.validUntil).toLocaleDateString() : '';
    const verifyUrl = `${window.location.origin}/verify`;
    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked — allow popups to export PDF'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(cred.achievementName)} — Credential</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; }
  .cert { border: 2px solid #4f46e5; border-radius: 12px; padding: 40px; max-width: 720px; margin: 0 auto; }
  .top { text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 24px; }
  .kicker { color: #4f46e5; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
  h1 { font-size: 26px; margin: 12px 0 4px; }
  .issuer { color: #6b7280; font-size: 14px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .row .k { color: #6b7280; }
  .row .v { font-weight: 600; text-align: right; }
  .desc { font-size: 14px; color: #374151; margin: 16px 0; line-height: 1.6; }
  .revoked { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; text-align: center; font-weight: 700; margin-bottom: 16px; }
  .verify { margin-top: 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .verify h2 { font-size: 13px; margin: 0 0 8px; color: #111827; }
  .verify p { font-size: 12px; color: #4b5563; margin: 4px 0; }
  .jwt { font-family: monospace; font-size: 8px; word-break: break-all; color: #374151; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; margin-top: 8px; }
  .foot { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 20px; }
</style></head><body onload="window.print()">
  <div class="cert">
    <div class="top">
      <div class="kicker">Open Badges 3.0 · Verifiable Credential</div>
      <h1>${esc(cred.achievementName)}</h1>
      <div class="issuer">Issued by ${esc(cred.issuerName)}</div>
    </div>
    ${isRevoked ? '<div class="revoked">⚠ THIS CREDENTIAL HAS BEEN REVOKED</div>' : ''}
    <div class="row"><span class="k">Awarded to</span><span class="v">${esc(recipientName)}${recipientEmail ? ' · ' + esc(recipientEmail) : ''}</span></div>
    <div class="row"><span class="k">Issued</span><span class="v">${esc(issued)}</span></div>
    ${validUntil ? `<div class="row"><span class="k">Valid until</span><span class="v">${esc(validUntil)}</span></div>` : ''}
    <div class="row"><span class="k">Signature</span><span class="v">ES256 · did:web</span></div>
    ${desc ? `<p class="desc">${esc(desc)}</p>` : ''}
    <div class="verify">
      <h2>How to verify this credential</h2>
      <p>1. Open an Open Badges 3.0 verifier (e.g. certlister.com/ob3-validator or ${esc(verifyUrl)}).</p>
      <p>2. Paste the signed credential token (JWT) below.</p>
      <p>3. The verifier confirms the issuer, signature, and revocation status — proving this document is authentic and unaltered.</p>
      ${jwt ? `<div class="jwt">${esc(jwt)}</div>` : ''}
    </div>
    <div class="foot">Academic Achievement Wallet · This PDF is a human-readable copy; the JWT above is the cryptographic proof.</div>
  </div>
</body></html>`);
    w.document.close();
    w.focus();
  };

  const handleRevoke = async () => {
    const reason = window.prompt('Reason for revocation (optional):') || '';
    setBusy(true);
    try {
      await revokeCredential(id, reason);
      toast.success('Credential revoked');
      await loadCredential();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Revoke failed');
    } finally {
      setBusy(false);
    }
  };

  const handleUnrevoke = async () => {
    setBusy(true);
    try {
      await unrevokeCredential(id);
      toast.success('Credential restored');
      await loadCredential();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (!cred) return <div className="text-center py-16"><p className="text-gray-500">Credential not found</p></div>;

  const isRevoked = cred.status === 'revoked';

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/credentials" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Credentials
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${isRevoked ? 'bg-red-50' : (cred.shareApproved ? 'bg-green-50' : 'bg-gray-100')}`}>
              <Award className={`w-7 h-7 ${isRevoked ? 'text-red-600' : (cred.shareApproved ? 'text-green-600' : 'text-gray-400')}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{cred.achievementName}</h1>
              <p className="text-sm text-gray-500 mt-1">Issued by: {cred.issuerName}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(cred.issuedDate || cred.createdAt).toLocaleString()}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-600">{cred.source === 'claim' ? 'From Announcement' : (cred.source === 'upload' ? 'Uploaded' : (cred.source === 'moodle_import' ? 'Moodle Import' : 'Issued'))}</span>
                {isRevoked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-red-50 text-red-600"><Ban className="w-3 h-3" />Revoked</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-indigo-50 text-indigo-600"><CheckCircle className="w-3 h-3" />Signed JWT-VC (ES256)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download PDF
            </button>
            {cred.shareApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg">
                <Share2 className="w-3.5 h-3.5" />
                Approved for Sharing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg">
                <Shield className="w-3.5 h-3.5" />
                Sharing Pending Approval
              </span>
            )}
          </div>
        </div>
      </div>

      {/* JWT-VC Section — present whenever a signed JWT exists */}
      {jwt && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileKey className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-700">Signed JWT-VC (Open Badges 3.0)</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Cryptographically signed credential (ES256). Verifiable on any 1EdTech OB 3.0 / W3C VC compliant verifier — including <a href="https://certlister.com/ob3-validator/" target="_blank" rel="noopener" className="text-indigo-600 underline">CertLister</a>.
          </p>
          <pre className="bg-gray-900 text-green-400 p-3 text-xs rounded-lg overflow-x-auto break-all whitespace-pre-wrap mb-3 max-h-32">{jwt}</pre>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copyJwt} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
              <Copy className="w-3.5 h-3.5" />Copy JWT
            </button>
            <button type="button" onClick={downloadJwt} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-3.5 h-3.5" />Download .jwt
            </button>
            <button type="button" onClick={verifyOnCertLister} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <ExternalLink className="w-3.5 h-3.5" />Verify on CertLister
            </button>
            <Link to="/verify" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <CheckCircle className="w-3.5 h-3.5" />Verify Locally
            </Link>
          </div>
        </div>
      )}

      {/* Admin: Revoke / Unrevoke */}
      {user.role === 'admin' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Admin Controls</h2>
          {isRevoked ? (
            <button type="button" onClick={handleUnrevoke} disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition disabled:opacity-50">
              <RotateCcw className="w-4 h-4" />Restore Credential
            </button>
          ) : (
            <button type="button" onClick={handleRevoke} disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50">
              <Ban className="w-4 h-4" />Revoke Credential
            </button>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Revocation flips the bit at index <code>{cred.statusListIndex}</code> in StatusList <code>{cred.statusListId}</code>. Verifiers reading credentialStatus will see the change immediately.
          </p>
        </div>
      )}

      {/* Share Section */}
      {cred.shareApproved && !isRevoked && (user.role === 'student' || user.role === 'admin') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Share Credential</h2>
          <p className="text-xs text-gray-500 mb-4">Create a shareable link to send this credential to Moodle or other external services via REST API.</p>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            {sharing ? 'Creating…' : 'Create Share Link'}
          </button>

          {shares.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500">Active Share Links:</p>
              {shares.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <code className="flex-1 text-gray-600 truncate">{window.location.origin}/shared/{cred.id}?token={s.token}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/shared/${cred.id}?token=${s.token}`);
                      toast.success('Copied');
                    }}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-gray-400">Views: {s.viewCount || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!cred.shareApproved && user.role === 'student' && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Sharing Not Yet Approved</p>
            <p className="text-xs text-amber-600 mt-1">Admin must approve this credential before you can share it with external services like Moodle.</p>
          </div>
        </div>
      )}

      {/* OB 3.0 JSON */}
      {ob3 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">OB 3.0 / W3C VC 2.0 – JSON-LD payload</h2>
            <button
              type="button"
              onClick={copyOb3}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy JSON
            </button>
          </div>
          <pre className="bg-gray-900 text-green-400 p-4 text-xs overflow-x-auto max-h-96">
            {JSON.stringify(ob3, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
