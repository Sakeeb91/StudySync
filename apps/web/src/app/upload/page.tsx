'use client';

import FileUploader from '@/components/upload/FileUploader';

export default function UploadPage() {
  const handleUploadComplete = (files: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    processingStatus: string;
  }>) => {
    console.log('Files uploaded:', files);
    // TODO: Navigate to processing status or show success message
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Upload Study Materials
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Upload your lecture notes, PDFs, or images. Our AI will extract the content
            and help you create flashcards, quizzes, and study guides.
          </p>
        </div>

        {/* Upload Component */}
        <FileUploader onUploadComplete={handleUploadComplete} />

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Multi-Format Support</h3>
            <p className="text-sm text-gray-600">
              Upload PDFs, Word documents, plain text files, or images of handwritten notes.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Processing</h3>
            <p className="text-sm text-gray-600">
              Our AI extracts text and understands context to generate the best study materials.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Organization</h3>
            <p className="text-sm text-gray-600">
              Tag uploads by course, topic, and date for easy retrieval later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
