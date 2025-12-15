"use client";

import { useUser, useClerk, useOrganizationList, useOrganization } from "@clerk/nextjs";
import { CreditCard, LogOut, Plus, Settings, User } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const UserMenu = () => {
    const { user } = useUser();
    const { organization } = useOrganization();
    const { openUserProfile, signOut, openCreateOrganization } = useClerk();
    const { userMemberships, setActive } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative">
                    <Avatar className="size-8 cursor-pointer hover:opacity-75 transition">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>{user.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
                <div className="flex items-center gap-2 p-2">
                    <Avatar className="size-8">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>{user.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none line-clamp-1">
                            {user.fullName || user.username}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground line-clamp-1">
                            {user.emailAddresses[0].emailAddress}
                        </p>
                    </div>
                </div>
                <DropdownMenuSeparator />

                {/* Organization Section */}
                <DropdownMenuItem
                    // @ts-ignore
                    onClick={() => setActive({ organization: null })}
                    className="flex items-center gap-2"
                >
                    <User className="size-4 mr-2" />
                    Personal Account
                    {!organization && <div className="ml-auto size-2 bg-blue-500 rounded-full" />}
                </DropdownMenuItem>

                {userMemberships?.data?.map((mem) => (
                    <DropdownMenuItem
                        key={mem.organization.id}
                        // @ts-ignore
                        onClick={() => setActive({ organization: mem.organization.id })}
                        className="flex items-center gap-2"
                    >
                        <Avatar className="size-4 rounded-sm">
                            <AvatarImage src={mem.organization.imageUrl} />
                            <AvatarFallback className="rounded-sm">{mem.organization.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate flex-1">{mem.organization.name}</span>
                        {organization?.id === mem.organization.id && <div className="ml-auto size-2 bg-blue-500 rounded-full" />}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuItem onClick={() => openCreateOrganization()}>
                    <Plus className="size-4 mr-2" />
                    Create Organization
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => openUserProfile()}>
                    <Settings className="size-4 mr-2" />
                    Manage Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="size-4 mr-2" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
