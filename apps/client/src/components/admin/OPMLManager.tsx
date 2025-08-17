// apps/client/src/components/admin/OPMLManager.tsx
import React, { useState } from 'react';
import type { OPMLImportResult } from '@ems/types';

interface OPMLManagerProps {
  className?: string;
}

/**
 * Admin component for OPML import/export operations
 * Features:
 * - Import OPML feed subscription files
 * - Export current feeds as OPML
 * - Import progress tracking
 * - Duplicate feed handling
 * - Error reporting for failed imports
 */
export const OPMLManager: React.FC<OPMLManagerProps> = ({ className = '' }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<OPMLImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImportOPML = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.opml') && !file.name.toLowerCase().endsWith('.xml')) {
      setError('Please select an OPML or XML file');
      return;
    }

    try {
      setIsImporting(true);
      setError(null);
      setImportResult(null);

      // TODO: Implement OPML import
      // const formData = new FormData();
      // formData.append('opml', file);
      //
      // const response = await fetch('/api/admin/feeds/import-opml', {
      //   method: 'POST',
      //   body: formData
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Failed to import OPML file');
      // }
      //
      // const result: OPMLImportResult = await response.json();
      // setImportResult(result);

      // Simulate import process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setImportResult({
        imported: 0,
        duplicates: 0,
        errors: [{ url: 'example.com/feed.xml', error: 'OPML import not yet implemented' }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import OPML');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleExportOPML = async () => {
    try {
      setIsExporting(true);
      setError(null);

      // TODO: Implement OPML export
      // const response = await fetch('/api/admin/feeds/export-opml');
      //
      // if (!response.ok) {
      //   throw new Error('Failed to export OPML');
      // }
      //
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `elonmusksucks-feeds-${new Date().toISOString().split('T')[0]}.opml`;
      // document.body.appendChild(a);
      // a.click();
      // document.body.removeChild(a);
      // window.URL.revokeObjectURL(url);

      setError('OPML export not yet implemented');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export OPML');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`p-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-6">OPML Import/Export</h2>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Import OPML</h3>
          <p className="text-gray-600 mb-4">
            Import RSS feeds from an OPML subscription file exported from other feed readers.
          </p>

          <div className="mb-4">
            <label
              htmlFor="opml-file"
              className={`block w-full p-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                isImporting
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {isImporting ? (
                <>
                  <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                  Importing OPML...
                </>
              ) : (
                <>
                  📁 Click to select OPML file
                  <br />
                  <span className="text-sm text-gray-500">Supports .opml and .xml files</span>
                </>
              )}
            </label>
            <input
              id="opml-file"
              type="file"
              accept=".opml,.xml"
              onChange={handleImportOPML}
              disabled={isImporting}
              className="hidden"
            />
          </div>

          {importResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">Import Results:</h4>
              <ul className="space-y-1 text-sm">
                <li className="text-green-600">✓ {importResult.imported} feeds imported</li>
                <li className="text-yellow-600">⚠ {importResult.duplicates} duplicates skipped</li>
                <li className="text-red-600">✗ {importResult.errors.length} errors</li>
              </ul>

              {importResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-600 text-sm">View Errors</summary>
                  <ul className="mt-1 pl-4 space-y-1 text-xs">
                    {importResult.errors.map((error, index) => (
                      <li key={index} className="text-red-500">
                        {error.url}: {error.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Export OPML</h3>
          <p className="text-gray-600 mb-4">
            Export your current active RSS feeds as an OPML file for backup or transfer to other
            feed readers.
          </p>

          <button
            onClick={handleExportOPML}
            disabled={isExporting}
            className={`w-full py-3 px-4 rounded font-medium transition-colors ${
              isExporting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isExporting ? (
              <>
                <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Generating OPML...
              </>
            ) : (
              '📥 Download OPML File'
            )}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Only active feeds will be included in the export.
          </p>
        </div>
      </div>

      {/* Information Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">About OPML</h4>
        <p className="text-sm text-blue-800">
          OPML (Outline Processor Markup Language) is a standard format for sharing RSS feed
          subscriptions between different feed readers and services. You can import OPML files
          exported from popular readers like Feedly, Inoreader, NewsBlur, or RSS Guard.
        </p>
      </div>

      {/* Implementation Status */}
      <div className="mt-6 p-4 bg-orange-50 border-l-4 border-orange-400">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-orange-800">
              <strong>🚧 Implementation Status:</strong> This component requires backend API
              integration for OPML parsing and feed creation. The UI framework is complete and ready
              for implementation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OPMLManager;
