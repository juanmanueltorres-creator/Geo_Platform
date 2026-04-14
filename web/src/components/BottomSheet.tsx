type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[10000]">
      <button
        type="button"
        aria-label="Close bottom sheet"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 w-full max-h-[80vh] overflow-y-auto rounded-t-3xl bg-slate-900 text-slate-50 shadow-2xl">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-600" />
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export default BottomSheet
