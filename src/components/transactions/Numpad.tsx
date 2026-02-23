"use client";

interface NumpadProps {
    value: string;
    onChange: (val: string) => void;
}

export function Numpad({ value, onChange }: NumpadProps) {
    const handlePress = (key: string) => {
        if (key === 'backspace') {
            if (value.length > 0) {
                onChange(value.slice(0, -1));
            }
        } else if (key === '.') {
            if (!value.includes('.')) {
                onChange(value === '' ? '0.' : value + '.');
            }
        } else {
            // Limit to 2 decimal places
            const [int, dec] = value.split('.');
            if (dec && dec.length >= 2) return;
            onChange(value === '0' ? key : value + key);
        }
    };

    const keys = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        '.', '0', 'backspace'
    ];

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-sm mx-auto">
            {keys.map((key) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => handlePress(key)}
                    className="aspect-[3/2] flex items-center justify-center text-2xl font-medium bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl active:bg-gray-100 dark:active:bg-gray-800 transition-colors shadow-sm"
                >
                    {key === 'backspace' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 4H8.2L1.1 11.1a1 1 0 0 0 0 1.4L8.2 20H21a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><path d="m18 9-6 6" /><path d="m12 9 6 6" /></svg>
                    ) : key}
                </button>
            ))}
        </div>
    );
}
