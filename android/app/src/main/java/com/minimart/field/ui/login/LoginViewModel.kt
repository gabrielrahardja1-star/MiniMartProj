package com.minimart.field.ui.login

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.minimart.field.BuildConfig
import com.minimart.field.data.LoginResult
import com.minimart.field.data.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    object Loading : LoginUiState()
    data class Error(val message: String) : LoginUiState()
    object LoggedIn : LoginUiState()
}

/** No one types an employee ID/PIN on this tablet - only a cashier ever
 * touches it, so the app signs itself in with the fixed identity baked
 * into the build. Reuses Repository.login() as-is, including its offline
 * fallback (verifies against the cached PIN hash when there's no signal). */
class LoginViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = Repository.get(application)
    private val _state = MutableStateFlow<LoginUiState>(LoginUiState.Loading)
    val state: StateFlow<LoginUiState> = _state

    init {
        attemptLogin()
    }

    fun attemptLogin() {
        _state.value = LoginUiState.Loading
        viewModelScope.launch {
            when (val result = repo.login(BuildConfig.TABLET_EMPLOYEE_ID, BuildConfig.TABLET_PIN)) {
                is LoginResult.Success -> {
                    _state.value = LoginUiState.LoggedIn
                    repo.refreshMasterData()
                }
                is LoginResult.Error -> _state.value = LoginUiState.Error(result.message)
            }
        }
    }
}
