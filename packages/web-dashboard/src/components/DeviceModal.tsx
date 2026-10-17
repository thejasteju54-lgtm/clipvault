import React from 'react';
import type { RegisteredDevice } from '@clipvault/shared';
import { X, Smartphone, Monitor, Globe, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: RegisteredDevice[];
  onRevokeDevice: (deviceId: string) => void;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  devices,
  onRevokeDevice
}) => {
  if (!isOpen) return null;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'android':
        return <Smartphone size={18} color="var(--color-primary)" />;
      case 'windows':
        return <Monitor size={18} color="var(--color-primary)" />;
      default:
        return <Globe size={18} color="var(--color-primary)" />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '560px',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Authorized Devices</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Manage multi-device synchronization and access control
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-dim)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Devices List */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {devices.map((device) => (
            <div
              key={device.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getPlatformIcon(device.platform)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{device.deviceName}</span>
                    {device.isRevoked ? (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--color-error-bg)',
                        color: 'var(--color-error)',
                        fontWeight: 600
                      }}>
                        REVOKED
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--color-success-bg)',
                        color: 'var(--color-success)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle2 size={10} />
                        Active
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {device.osVersion} • Last seen {new Date(device.lastSeenAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {!device.isRevoked && (
                <button
                  onClick={() => onRevokeDevice(device.deviceId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-error-bg)',
                    color: 'var(--color-error)',
                    border: '1px solid rgba(211, 47, 47, 0.25)',
                    transition: 'var(--transition-fast)'
                  }}
                  title="Revoke device access"
                >
                  <ShieldAlert size={13} />
                  <span>Revoke</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-canvas)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-main)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
