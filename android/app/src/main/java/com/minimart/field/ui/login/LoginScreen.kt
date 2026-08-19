package com.minimart.field.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

/** Shown only for the moment it takes to auto-sign-in on launch (or, rarely,
 * if that fails with nothing cached to fall back to offline). There's no
 * form here - only a cashier ever touches this tablet. */
@Composable
fun LoginScreen(onLoggedIn: () -> Unit, viewModel: LoginViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()

    if (state is LoginUiState.LoggedIn) {
        onLoggedIn()
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("MiniMart Field", style = MaterialTheme.typography.headlineMedium)
        androidx.compose.foundation.layout.Spacer(Modifier.padding(12.dp))

        when (val s = state) {
            is LoginUiState.Loading -> CircularProgressIndicator()
            is LoginUiState.Error -> {
                Text("Signing in...", color = Color.Gray)
                androidx.compose.foundation.layout.Spacer(Modifier.padding(4.dp))
                Text(s.message, color = Color.Red)
                androidx.compose.foundation.layout.Spacer(Modifier.padding(8.dp))
                Button(onClick = { viewModel.attemptLogin() }, modifier = Modifier.fillMaxWidth()) {
                    Text("Retry")
                }
            }
            else -> {}
        }
    }
}
