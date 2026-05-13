'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      richColors
      closeButton
      expand
      duration={3500}
      visibleToasts={4}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast !rounded-xl !border !shadow-[0_18px_48px_-18px_rgba(61,8,20,0.35)] !bg-white !text-[#3D0814] !border-[#F2DCC8] !font-medium',
          title: '!font-semibold !text-sm !text-[#3D0814]',
          description: '!text-xs !text-[#6B0F1A]/80',
          actionButton:
            '!bg-[#3D0814] !text-white !rounded-md !text-xs !font-semibold hover:!bg-[#6B0F1A]',
          cancelButton:
            '!bg-[#FFFBF5] !text-[#3D0814] !border !border-[#F2DCC8] !rounded-md !text-xs',
          success: '!bg-white !text-[#3D0814] !border-l-4 !border-l-[#16A34A]',
          error: '!bg-white !text-[#3D0814] !border-l-4 !border-l-[#B91C1C]',
          warning: '!bg-white !text-[#3D0814] !border-l-4 !border-l-[#F59E0B]',
          info: '!bg-white !text-[#3D0814] !border-l-4 !border-l-[#F97316]',
          loading: '!bg-white !text-[#3D0814] !border-l-4 !border-l-[#3D0814]',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
