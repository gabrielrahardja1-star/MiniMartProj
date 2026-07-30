package com.minimart.field.ui.login

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.minimart.field.data.LoginResult
import com.minimart.field.data.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    data class Error(val message: String) : LoginUiState()
    object LoggedIn : LoginUiState()
}

class LoginViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = Repository.get(application)
    private val _state = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val state: StateFlow<LoginUiState> = _state

    fun login(employeeId: String, pin: String) {
        _state.value = LoginUiState.Loading
        viewModelScope.launch {
            when (val result = repo.login(employeeId, pin)) {
                is LoginResult.Success -> {
                    _state.value = LoginUiState.LoggedIn
                    repo.refreshMasterData()
                }
                is LoginResult.Error -> _state.value = LoginUiState.Error(result.message)
            }
        }
    }
}
