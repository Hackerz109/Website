import { Download, FileJson, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCSV, exportJSON, exportExcel, exportPDF } from "@/lib/admin-analytics-export";

interface ExportMenuProps {
  filename: string;
  rows: Record<string, unknown>[];
  rawData?: unknown;
  pdfTitle?: string;
  pdfSections?: { heading: string; rows: Record<string, unknown>[] }[];
}

export function ExportMenu({ filename, rows, rawData, pdfTitle, pdfSections }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(filename, rows)} className="gap-2">
          <Table2 className="h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportExcel(filename, rows)} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportJSON(filename, rawData ?? rows)} className="gap-2">
          <FileJson className="h-4 w-4" /> JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportPDF(pdfTitle || filename, pdfSections || [{ heading: filename, rows }])}
          className="gap-2"
        >
          <FileText className="h-4 w-4" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
