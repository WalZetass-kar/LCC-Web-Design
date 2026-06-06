package com.zetass.pos;

import android.Manifest;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "AndroidRuntimePermissions",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "bluetoothConnect", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "bluetoothScan", strings = { Manifest.permission.BLUETOOTH_SCAN }),
        @Permission(alias = "readExternalStorage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
        @Permission(alias = "writeExternalStorage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
    }
)
public class AndroidRuntimePermissionsPlugin extends Plugin {}
