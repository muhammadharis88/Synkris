import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";

import { SearchInput } from "./search-input";

export const Navbar = () => {
    return (
        <nav className="flex items-center justify-between h-full w-full">
            <div className="flex gap-3 items-center shrink-0 pr-6">
                <Link href="/">
                    <Image src="/logo.svg" alt="logo" width={36} height={36} />
                </Link>
                <h3 className="text-xl font-medium">Synkris</h3>
                <Link href="/organizations">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Building2 className="size-4" />
                        Organizations
                    </Button>
                </Link>
            </div>
            <SearchInput />
            <div className="flex gap-3 items-center pl-6">
                <UserMenu />
            </div>
        </nav>
    );
};
