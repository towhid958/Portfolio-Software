import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface BulkEditField {
  label: string;
  name: string;
  type: 'select' | 'switch';
  options?: { label: string; value: string }[];
}

interface BulkEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (values: Record<string, any>) => void;
  selectedCount: number;
  fields: BulkEditField[];
  title: string;
  isPending?: boolean;
}

export function BulkEditDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  fields,
  title,
  isPending = false,
}: BulkEditDialogProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedFields([]);
      setFieldValues({});
    }
  }, [isOpen]);

  const handleToggleField = (fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((f) => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handleValueChange = (fieldName: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleConfirm = () => {
    const valuesToUpdate: Record<string, any> = {};
    selectedFields.forEach((field) => {
      valuesToUpdate[field] = fieldValues[field];
    });
    onConfirm(valuesToUpdate);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Updating <Badge variant="secondary" className="px-1 py-0">{selectedCount}</Badge> items. Only selected fields will be updated.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {fields.map((field) => (
            <div key={field.name} className="flex items-start space-x-4 space-y-0">
              <Switch
                id={`toggle-${field.name}`}
                checked={selectedFields.includes(field.name)}
                onCheckedChange={() => handleToggleField(field.name)}
              />
              <div className="grid gap-1.5 flex-1">
                <Label
                  htmlFor={`toggle-${field.name}`}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {field.label}
                </Label>
                {selectedFields.includes(field.name) && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {field.type === 'select' ? (
                      <Select
                        value={fieldValues[field.name] || ''}
                        onValueChange={(val) => handleValueChange(field.name, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={fieldValues[field.name] || false}
                          onCheckedChange={(val) => handleValueChange(field.name, val)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {fieldValues[field.name] ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedFields.length === 0 || isPending}
          >
            {isPending ? 'Updating...' : 'Update Selected Items'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
