export async function uploadProfilePhoto(file: File): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return `https://storage.mock.example.com/avatars/${Date.now()}-${file.name}`;
}
