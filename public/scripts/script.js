// file: script.js
$(document).ready(function(){
    //initialize the firebase app
    var config = {
      apiKey: "AIzaSyAsPdolj3xYtfiiQ1hL795PoTJRqz9IBg0",
    	authDomain: "savvy-aa31e.firebaseapp.com",
	    databaseURL: "https://savvy-aa31e.firebaseio.com",
    	projectId: "savvy-aa31e",
    	storageBucket: "savvy-aa31e.appspot.com",
    	messagingSenderId: "66499803255"
    };
    if (!firebase.apps.length)
      firebase.initializeApp(config);
  
    //create firebase references
    var Auth = firebase.auth(); 
    var dbRef = firebase.database();
    var usersRef = dbRef.ref('users/')
    var auth = null;


    $('#loginModal').on('shown.bs.modal', function(e) {
      $('#loginEmail').focus();
    });

    $('#registerModal').on('shown.bs.modal', function(e) {
      $('#registerFirstName').focus();
    });

    //Register
    $('#registerConfirmPassword').keypress(function (e) {
      if (e.keyCode == 13) $('#doRegister').click();
    })

    $('#doRegister').on('click', function (e) {
      e.preventDefault();
      $('#messageModalLabel').html(spanText('<i class="fa fa-cog fa-spin"></i>', ['center', 'info']));
      $('#messageModal').modal('show');
      var data = {
        email: $('#registerEmail').val(), //get the email from Form
        firstName: $('#registerFirstName').val(), // get firstName
        lastName: $('#registerLastName').val(), // get lastName
      };
      var passwords = {
        password : $('#registerPassword').val(), //get the pass from Form
        cPassword : $('#registerConfirmPassword').val(), //get the confirmPass from Form
      }
      if( data.email != '' && passwords.password != ''  && passwords.cPassword != '' ){
        if( passwords.password == passwords.cPassword ){
          //create the user
          
          firebase.auth()
            .createUserWithEmailAndPassword(data.email, passwords.password)
            .then(function(user){
              //now user is needed to be logged in to save data
              usersRef.child(user.uid).set(data).then(function () {
                $('#registerModal').modal('hide');
                console.log("Successfully created user account with uid:", user.uid);
                window.location.href = "home.html";
                // window.location.href = "questions.html";
              });
            })
            .catch(function(error){
              document.getElementById("register_error").innerHTML = error.message;
              console.log("Error creating user:", error);
            });
        } else {
          //password and confirm password didn't match
          document.getElementById("register_error").innerHTML = "Passwords don't match";
        }
      }  
    });
  
    //Login
    $('#loginPassword').keypress(function (e){
      if(e.keyCode == 13 ) $('#doLogin').click();
    });

    $('#loginEmail').keypress(function (e) {
      if (e.keyCode == 13) $('#doLogin').click();
    })

    $('#doLogin').on('click', function (e) {
      e.preventDefault();
      //$('#loginModal').modal('hide');
      $('#messageModalLabel').html(spanText('<i class="fa fa-cog fa-spin"></i>', ['center', 'info']));
      $('#messageModal').modal('show');
  
      if( $('#loginEmail').val() != '' && $('#loginPassword').val() != '' ){
        //login the user
        var data = {
          email: $('#loginEmail').val(),
          password: $('#loginPassword').val()
        };
        
        firebase.auth().signInWithEmailAndPassword(data.email, data.password)
          .then(function(authData) {
            document.getElementById('login_error').innerHTML = "";
            $('#loginModal').modal('hide');
            console.log("Authenticated successfully with payload:", authData);
            auth = authData;
            $('#messageModalLabel').html(spanText('Success!', ['center', 'success']))
            window.location.href = "home.html";
          })
          .catch(function(error) {
            console.log("Login Failed!", error);
            document.getElementById('login_error').innerHTML = "Incorrect Email or Password";
            $('#messageModalLabel').html(spanText('ERROR: '+error.code, ['danger']))
          });
      }
    });

  })
   
  
  function spanText(textStr, textClasses) {
    var classNames = textClasses.map(c => 'text-'+c).join(' ');
    return '<span class="'+classNames+'">'+ textStr + '</span>';
  }