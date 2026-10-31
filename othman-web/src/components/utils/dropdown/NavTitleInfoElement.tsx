import React from 'react'
import { cn } from '@/lib/utils'
import type {NavItem} from "@/data/configData.ts";
import {useTranslation} from "react-i18next";

type NavTitleInfoElementProps = {
    item: NavItem
    redirectFn: (item: NavItem) => void
}

const NavTitleInfoElement: React.FC<NavTitleInfoElementProps> = ({
    item,
    redirectFn,
}) => {
    const { t } = useTranslation()
    if (!item) return <></>

    return (
        <button
            onClick={() => redirectFn(item)}
            className={`w-full max-w-md flex flex-col text-left px-10 py-4 w-min-150
                        hover:bg-blue-50/70 transition-colors duration-200 ease-in-out 
                        text-gray-700 hover:text-blue-500 cursor-pointer`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {item.Icon && <item.Icon className={'h-5 w-5 '} />}

                    <span className={cn('font-medium text-sm md:text-base')}>
                        {t(item.title)}
                    </span>
                </div>
                {item.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                        {t(item.description)}
                    </p>
                )}
            </div>
        </button>
    )
}

export default NavTitleInfoElement
