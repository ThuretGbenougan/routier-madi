import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/LanguageProvider";
import { resetDemoData } from "@/lib/store";

export function DemoResetButton({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <RotateCcw className="size-4" aria-hidden />
          {t("action.reset")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("reset.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("reset.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetDemoData();
              toast.success(t("reset.done"));
            }}
          >
            {t("reset.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
