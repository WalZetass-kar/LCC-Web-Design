package com.mediasoft.pos.zetass;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidRuntimePermissionsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
