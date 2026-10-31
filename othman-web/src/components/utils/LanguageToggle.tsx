import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Globe } from "lucide-react";
import {LANGUAGES} from "@/i18n";
import {useTranslation} from "react-i18next";

const LanguageToggle = () => {
    const {t, i18n} = useTranslation();

    return (
        <Tooltip>
            <DropdownMenu>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                            <Globe className="h-4 w-4 text-black dark:text-white" />
                            <span className="sr-only">{t("nav.toggleLanguage")}</span>
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>

                <DropdownMenuContent align="center">
                    {LANGUAGES.map((lang) => (
                        <DropdownMenuItem
                            key={lang.code}
                            onClick={() => i18n.changeLanguage(lang.code)}
                            className="flex items-center justify-between gap-4 cursor-pointer transition duration-100"
                        >
                            <span>{lang.label}</span>
                            {i18n.language === lang.code && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <TooltipContent>
                <p>{t("nav.toggleLanguage")}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export default LanguageToggle