import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({ 
  isOpen, 
  title = 'Success', 
  message, 
  onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full pointer-events-auto border-2 border-green-200">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-neutral-700">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-primary cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessDialog;
