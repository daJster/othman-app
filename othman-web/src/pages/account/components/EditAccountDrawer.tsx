import { useState } from 'react';

import { EditableAvatar } from '@/components/ui/editable-avatar';
import {
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldContent,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { DeferredButton } from '@/components/ui/deferred-button';
import type { AccountData } from '@/firebase/auth/type';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/types';

export interface EditAccountDrawerRef {
    open: () => void;
    close: () => void;
}

interface FormData {
    displayName: string;
    photoURL: string;
    email: string;
    phoneNumber: string;
    role: UserRole;
}

interface EditAccountDrawerProps {
    account: AccountData;
}

const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'guest', label: 'Guest' },
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
    { value: 'superadmin', label: 'Super Admin' },
];

export const EditAccountDrawer = ({ account }: EditAccountDrawerProps) => {
    const [formData, setFormData] = useState<FormData>({
        displayName: account.displayName ?? '',
        photoURL: account.photoURL ?? '',
        email: account.email ?? '',
        phoneNumber:
            ((account as Record<string, unknown>).phoneNumber as string) ?? '',
        role: account.role ?? 'user',
    });

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        console.log('Saving:', formData);
    };

    return (
        <DrawerContent className="mx-auto max-w-3xl">
            <DrawerHeader>
                <DrawerTitle>Edit Profile</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 flex flex-col items-center overflow-hidden">
                <div className="w-40 h-40">
                    <EditableAvatar
                        src={formData.photoURL}
                        alt={formData.displayName}
                        onUpload={(url) => handleChange('photoURL', url)}
                    />
                </div>
                <FieldGroup className="mt-6 w-full max-w-sm">
                    <Field>
                        <FieldLabel htmlFor="displayName">Full Name</FieldLabel>
                        <FieldContent>
                            <Input
                                id="displayName"
                                value={formData.displayName}
                                onChange={(e) =>
                                    handleChange('displayName', e.target.value)
                                }
                                placeholder="Enter your full name"
                            />
                        </FieldContent>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <FieldContent>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    handleChange('email', e.target.value)
                                }
                                placeholder="Enter your email"
                            />
                        </FieldContent>
                    </Field>

                    <div className="flex gap-4">
                        <Field className="flex-1">
                            <FieldLabel htmlFor="phoneNumber">
                                Phone Number
                            </FieldLabel>
                            <FieldContent>
                                <Input
                                    id="phoneNumber"
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) =>
                                        handleChange(
                                            'phoneNumber',
                                            e.target.value
                                        )
                                    }
                                    placeholder="+212 06 12 34 56 78"
                                />
                            </FieldContent>
                        </Field>

                        <Field className="max-w-32">
                            <FieldLabel htmlFor="role">Role</FieldLabel>
                            <FieldContent>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value) =>
                                        handleChange('role', value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roleOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FieldContent>
                        </Field>
                    </div>
                </FieldGroup>
                <DrawerFooter className="flex flex-row p-0 justify-between items-center w-full mt-10">
                    <DrawerClose asChild>
                        <Button variant="outline" className="h-10">
                            Cancel
                        </Button>
                    </DrawerClose>
                    <DeferredButton
                        asyncFn={handleSave}
                        className="flex items-center gap-2 h-10"
                    >
                        <span>Save</span>
                        <Save />
                    </DeferredButton>
                </DrawerFooter>
            </div>
        </DrawerContent>
    );
};
