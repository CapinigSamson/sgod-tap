import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Check } from "lucide-react";

export default function MobileSelect({ value, onValueChange, options, placeholder = "Select...", triggerClassName = "", label }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Desktop: use standard Select
  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: use Vaul Drawer
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <Button
          variant="outline"
          className={`${triggerClassName} justify-between font-normal`}
        >
          <span className={value ? "" : "text-muted-foreground"}>{selectedLabel}</span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50 rotate-90" />
        </Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[16px] mt-24 fixed bottom-0 left-0 right-0 z-50 max-h-[70vh]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 mt-3 mb-4" />
          {label && (
            <div className="px-4 pb-2">
              <Drawer.Title className="text-sm font-semibold text-slate-800">{label}</Drawer.Title>
            </div>
          )}
          <div className="overflow-y-auto px-2 pb-6">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onValueChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                  value === opt.value
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm">{opt.label}</span>
                {value === opt.value && <Check className="h-4 w-4 text-indigo-600" />}
              </button>
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
