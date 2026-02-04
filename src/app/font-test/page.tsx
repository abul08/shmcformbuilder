export default function FontTestPage() {
    return (
        <div className="p-10 space-y-8 bg-gray-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-8">Font Configuration Test</h1>

            <div className="space-y-4 border p-4 rounded border-gray-700">
                <h2 className="text-xl text-gray-400">Inter (font-sans)</h2>
                <p className="font-sans text-2xl">
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ
                    <br />
                    abcdefghijklmnopqrstuvwxyz
                    <br />
                    1234567890
                </p>
                <p className="font-sans text-sm text-gray-500">Should look like a clean, modern sans-serif.</p>
            </div>

            <div className="space-y-4 border p-4 rounded border-gray-700" dir="rtl">
                <h2 className="text-xl text-gray-400 font-sans text-left" dir="ltr">Waheed (font-waheed)</h2>
                <p className="font-waheed text-4xl leading-loose">
                    ދިވެހިރާއްޖެ
                    <br />
                    އަބްދުﷲ ފާރޫޤް
                </p>
                <p className="font-sans text-sm text-gray-500 text-left" dir="ltr">Should look like the decorative Waheed font (bold headings).</p>
            </div>

            <div className="space-y-4 border p-4 rounded border-gray-700" dir="rtl">
                <h2 className="text-xl text-gray-400 font-sans text-left" dir="ltr">Faruma (font-faruma)</h2>
                <p className="font-faruma text-2xl leading-loose">
                    މިއީ ދިވެހި ބަހުން ލިޔެފައިވާ ލިޔުމެކެވެ.
                </p>
                <p className="font-sans text-sm text-gray-500 text-left" dir="ltr">Should look like the standard Faruma body text.</p>
            </div>

            <div className="mt-8 p-4 bg-black rounded font-mono text-xs">
                <p>Debug Info:</p>
                <p>font-sans family: <span className="font-sans">var(--font-sans)</span></p>
                <p>font-waheed family: <span className="font-waheed">var(--font-waheed)</span></p>
            </div>
        </div>
    );
}
